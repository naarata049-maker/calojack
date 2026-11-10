// 部屋（オンラインの通信）。部屋をつくった人のスマホ＝親がゲームの状態を持ち、
// ほかの人のスマホ＝子は「何をしたか」を親に送って、親から新しい状態を受け取る。
// つなぎ方は PeerJS（スマホどうしを直接つなぐ）。親だけ・コンピュータだけなら通信なしでも動く。
import Peer, { type DataConnection } from 'peerjs'
import { apply, createGame } from '../game/engine'
import { decideCpu } from '../game/cpu'
import { SAMPLE_FOODS } from '../game/samples'
import type { Action, Card, GameState } from '../game/types'

export type Photos = Record<string, string>

type Msg =
  | { t: 'hello'; playerId: string; name: string }
  | { t: 'action'; action: Action }
  | { t: 'state'; state: GameState }
  | { t: 'photos'; photos: Photos }
  | { t: 'error'; reason: string }

export type RoomStatus = 'connecting' | 'open' | 'closed' | 'error'

export interface Room {
  readonly me: string
  readonly isHost: boolean
  readonly code: string
  getState(): GameState | null
  getPhotos(): Photos
  getStatus(): { status: RoomStatus; message?: string }
  dispatch(action: Action): void
  subscribe(fn: () => void): () => void
  close(): void
}

const PREFIX = 'calojack-v1-'
const env = import.meta.env

function peerOptions() {
  // テストのときだけ、手元の PeerJS サーバーを使う（VITE_PEER_HOST）
  if (env.VITE_PEER_HOST) {
    return { host: env.VITE_PEER_HOST as string, port: Number(env.VITE_PEER_PORT ?? 9000), path: '/', secure: false }
  }
  return {}
}

/** このスマホの名札（読み込み直しても同じ人として戻れるように） */
export function myPlayerId() {
  try {
    const saved = localStorage.getItem('calojack-player-id')
    if (saved) return saved
    const id = 'p' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('calojack-player-id', id)
    return id
  } catch {
    return 'p' + Math.random().toString(36).slice(2, 10)
  }
}

export function randomCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

/** 写真の data URL は大きいので、状態とは別に送る。カードには「ref:写真のid」だけ入れる */
function splitPhotos(cards: Card[], photos: Photos) {
  return cards.map((c) => {
    if (c.photo && c.photo.startsWith('data:')) {
      photos[c.id] = c.photo
      return { ...c, photo: `ref:${c.id}` }
    }
    return c
  })
}

export function photoUrl(card: Card, photos: Photos) {
  if (!card.photo) return undefined
  if (card.photo.startsWith('ref:')) return photos[card.photo.slice(4)]
  return card.photo
}

abstract class BaseRoom implements Room {
  protected state: GameState | null = null
  protected photos: Photos = {}
  protected status: RoomStatus = 'connecting'
  protected message?: string
  private listeners = new Set<() => void>()
  abstract readonly isHost: boolean
  readonly me: string
  code: string

  constructor(me: string, code: string) {
    this.me = me
    this.code = code
  }
  getState() {
    return this.state
  }
  getPhotos() {
    return this.photos
  }
  getStatus() {
    return { status: this.status, message: this.message }
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  protected emit() {
    this.listeners.forEach((fn) => fn())
  }
  abstract dispatch(action: Action): void
  abstract close(): void
}

/** 親（部屋をつくった人） */
export class HostRoom extends BaseRoom {
  readonly isHost = true
  private peer: Peer | null = null
  private conns = new Map<string, DataConnection>()
  private cpuTimers = new Map<string, number>()
  private closed = false

  constructor(me: string, name: string, options: { online: boolean }) {
    super(me, randomCode())
    this.state = createGame(this.code, { id: me, name })
    if (options.online) this.open(0)
    else this.status = 'open'
  }

  private open(tries: number) {
    const peer = new Peer(PREFIX + this.code, peerOptions())
    this.peer = peer
    peer.on('open', () => {
      this.status = 'open'
      this.emit()
    })
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries < 5) {
        // 同じ招待コードの部屋がすでにあるので、別のコードでつくり直す
        peer.destroy()
        this.code = randomCode()
        this.state = { ...this.state!, code: this.code }
        this.open(tries + 1)
        return
      }
      if (this.status !== 'open') {
        this.status = 'error'
        this.message = 'つながりませんでした。電波のよいところで、もう一度ためしてください'
        this.emit()
      }
    })
    peer.on('disconnected', () => {
      if (!this.closed) peer.reconnect()
    })
    peer.on('connection', (conn) => this.accept(conn))
  }

  private accept(conn: DataConnection) {
    let playerId: string | null = null
    conn.on('data', (raw) => {
      const msg = raw as Msg
      if (msg.t === 'hello') {
        const before = this.state!
        this.run(msg.playerId, { type: 'join', name: msg.name })
        if (!this.state!.players.some((p) => p.id === msg.playerId)) {
          const reason = before.phase !== 'lobby' ? 'もうゲームが始まっています' : '部屋がいっぱいです（4人まで）'
          conn.send({ t: 'error', reason } satisfies Msg)
          setTimeout(() => conn.close(), 500)
          return
        }
        playerId = msg.playerId
        this.conns.get(playerId)?.close()
        this.conns.set(playerId, conn)
        conn.send({ t: 'photos', photos: this.photos } satisfies Msg)
        conn.send({ t: 'state', state: this.state! } satisfies Msg)
      } else if (msg.t === 'action' && playerId) {
        this.run(playerId, msg.action)
      }
    })
    conn.on('close', () => {
      if (playerId && this.conns.get(playerId) === conn) {
        this.conns.delete(playerId)
        const s = structuredClone(this.state!)
        const p = s.players.find((x) => x.id === playerId)
        if (p) p.connected = false
        this.state = s
        this.broadcast()
      }
    })
  }

  dispatch(action: Action) {
    this.run(this.me, action)
  }

  private run(playerId: string, action: Action) {
    let a = action
    let newPhotos = false
    if (a.type === 'setPhotos') {
      const before = Object.keys(this.photos).length
      a = { ...a, photos: splitPhotos(a.photos, this.photos) }
      newPhotos = Object.keys(this.photos).length !== before
    }
    const next = apply(this.state!, playerId, a, { samples: SAMPLE_FOODS })
    if (next === this.state && !newPhotos) return
    this.state = next
    if (newPhotos) this.sendAll({ t: 'photos', photos: this.photos })
    this.broadcast()
    this.scheduleCpus()
  }

  private sendAll(msg: Msg) {
    this.conns.forEach((c) => {
      if (c.open) c.send(msg)
    })
  }

  private broadcast() {
    this.sendAll({ t: 'state', state: this.state! })
    this.emit()
  }

  /** コンピュータの番が来たら、少し考えるふりをしてから動かす */
  private scheduleCpus() {
    const s = this.state!
    s.players
      .filter((p) => p.isCpu)
      .forEach((cpu) => {
        if (this.cpuTimers.has(cpu.id)) return
        if (!decideCpu(s, cpu.id)) return
        const timer = window.setTimeout(() => {
          this.cpuTimers.delete(cpu.id)
          if (this.closed) return
          const action = decideCpu(this.state!, cpu.id)
          if (action) this.run(cpu.id, action)
          else this.scheduleCpus()
        }, 700 + Math.random() * 1100)
        this.cpuTimers.set(cpu.id, timer)
      })
  }

  close() {
    this.closed = true
    this.cpuTimers.forEach((t) => clearTimeout(t))
    this.conns.forEach((c) => c.close())
    this.peer?.destroy()
    this.status = 'closed'
  }
}

/** 子（招待コードで入った人） */
export class GuestRoom extends BaseRoom {
  readonly isHost = false
  private peer: Peer
  private conn: DataConnection | null = null
  private closed = false
  private name: string

  constructor(me: string, name: string, code: string) {
    super(me, code)
    this.name = name
    this.peer = new Peer(peerOptions())
    this.peer.on('open', () => this.connect())
    this.peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        this.fail('この招待コードの部屋が見つかりません')
      } else if (this.status !== 'open') {
        this.fail('つながりませんでした。電波のよいところで、もう一度ためしてください')
      }
    })
  }

  private connect() {
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true })
    this.conn = conn
    conn.on('open', () => {
      conn.send({ t: 'hello', playerId: this.me, name: this.name } satisfies Msg)
    })
    conn.on('data', (raw) => {
      const msg = raw as Msg
      if (msg.t === 'state') {
        this.state = msg.state
        this.status = 'open'
        this.emit()
      } else if (msg.t === 'photos') {
        this.photos = { ...this.photos, ...msg.photos }
        this.emit()
      } else if (msg.t === 'error') {
        this.fail(msg.reason)
      }
    })
    conn.on('close', () => {
      if (this.closed || this.status === 'error') return
      // 親とつながりが切れたら、少し待ってつなぎ直す
      this.status = 'connecting'
      this.message = 'つなぎ直しています…'
      this.emit()
      setTimeout(() => !this.closed && this.connect(), 1500)
    })
  }

  private fail(message: string) {
    this.status = 'error'
    this.message = message
    this.emit()
  }

  dispatch(action: Action) {
    if (this.conn?.open) this.conn.send({ t: 'action', action } satisfies Msg)
  }

  close() {
    this.closed = true
    this.conn?.close()
    this.peer.destroy()
    this.status = 'closed'
  }
}
