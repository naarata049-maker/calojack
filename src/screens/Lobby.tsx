// 01 友達を集める（Figma 417:2）
import { useState } from 'react'
import Header from '../components/Header.tsx'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/engine.ts'
import type { GameState, Settings } from '../game/types.ts'
import type { Room } from '../net/room.ts'
import './Lobby.css'

const TARGETS = [1800, 2000, 2300, 2650, 3000]
const ROUNDS = [1, 2, 3, 4, 5]
const CHIPS = [5, 10, 15, 20]

function next<T>(list: T[], now: T) {
  return list[(list.indexOf(now) + 1) % list.length]
}

type Props = {
  room: Room
  state: GameState
  online: boolean
  onEditPhotos: () => void
  onLeave: () => void
}

export default function Lobby({ room, state, online, onEditPhotos, onLeave }: Props) {
  const isHost = room.isHost
  const [copied, setCopied] = useState(false)
  const me = state.players.find((p) => p.id === room.me)
  const allReady = state.players.every((p) => p.ready)
  const canStart = isHost && state.players.length >= MIN_PLAYERS && allReady
  const empty = MAX_PLAYERS - state.players.length
  const s = state.settings

  function change(patch: Partial<Settings>) {
    room.dispatch({ type: 'setSettings', settings: patch })
  }

  async function share() {
    const url = `${location.origin}${import.meta.env.BASE_URL}?room=${state.code}`
    const text = `Calojack であそぼう！ 招待コード ${state.code}`
    try {
      if (navigator.share) await navigator.share({ title: 'Calojack', text, url })
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* 閉じただけ */
    }
  }

  let hint = ''
  if (isHost) {
    if (state.players.length < MIN_PLAYERS) hint = online ? '友達かコンピュータを入れてね' : 'コンピュータを入れてね'
    else if (!allReady) hint = '全員が写真を選ぶのを待っています'
  } else hint = '部屋をつくった人が始めるのを待っています'

  return (
    <main className="lobby">
      <Header title={online ? '友達とあそぶ' : 'コンピュータとあそぶ'} onBack={onLeave} />
      <div className="lobby__body">
        {online && (
          <section className="lobby__invite sticker">
            <p className="label">招待コード</p>
            <div className="lobby__digits">
              {state.code.split('').map((d, i) => (
                <span key={i} className="lobby__digit pop">
                  {d}
                </span>
              ))}
            </div>
            <button className="btn is-small lobby__share" onClick={share}>
              {copied ? 'コピーしました！' : '招待リンクを送る'}
            </button>
          </section>
        )}

        <section className="lobby__people sticker">
          <p className="label">
            集まった人 {state.players.length} / {MAX_PLAYERS}
          </p>
          <ul className="lobby__list">
            {state.players.map((p) => {
              const mine = p.id === room.me
              return (
                <li key={p.id} className="lobby__person">
                  <button
                    className="lobby__avatar"
                    style={{ background: p.color }}
                    onClick={mine ? onEditPhotos : undefined}
                    disabled={!mine}
                    aria-label={mine ? '写真をえらぶ' : p.name}
                  >
                    {p.isCpu && <span className="lobby__cpu pop">CPU</span>}
                    {isHost && p.isCpu && (
                      <span
                        className="lobby__remove"
                        role="button"
                        aria-label="外す"
                        onClick={(e) => {
                          e.stopPropagation()
                          room.dispatch({ type: 'removePlayer', playerId: p.id })
                        }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                  <span className="lobby__name label">{mine ? 'あなた' : p.name}</span>
                  <span className={`lobby__status ${p.ready ? 'is-ready' : ''} ${!p.connected ? 'is-off' : ''}`}>
                    {!p.connected ? '通信がとぎれた' : p.ready ? '準備OK' : '写真を選び中…'}
                  </span>
                </li>
              )
            })}
            {Array.from({ length: empty }, (_, i) => (
              <li key={`e${i}`} className="lobby__person">
                <button
                  className="lobby__avatar is-empty pop"
                  onClick={isHost && i === 0 ? () => room.dispatch({ type: 'addCpu' }) : undefined}
                  disabled={!isHost || i !== 0}
                  aria-label="コンピュータを入れる"
                >
                  ＋
                </button>
                <span className="lobby__name label">{isHost && i === 0 ? 'CPUを入れる' : ''}</span>
                <span className="lobby__status is-empty">あと{empty}人</span>
              </li>
            ))}
          </ul>
          {me?.ready && (
            <button className="lobby__photos" onClick={onEditPhotos}>
              自分の写真 {me.photos.length}枚 ・ えらびなおす ›
            </button>
          )}
        </section>

        <p className="lobby__heading label">このゲームの設定</p>
        <div className="lobby__settings">
          <Tile label="目標" onChange={isHost ? () => change({ target: next(TARGETS, s.target) }) : undefined}>
            {s.target.toLocaleString()}
            <small>kcal</small>
          </Tile>
          <Tile label="ラウンド" big onChange={isHost ? () => change({ rounds: next(ROUNDS, s.rounds) }) : undefined}>
            {s.rounds}
          </Tile>
          <Tile label="チップ" big onChange={isHost ? () => change({ startChips: next(CHIPS, s.startChips) }) : undefined}>
            {s.startChips}
            <small>枚</small>
          </Tile>
        </div>
        <p className="lobby__note pop">目標は「20代男性・活動量が低めの1日の目安」から</p>
      </div>

      <div className="lobby__foot">
        {hint && <p className="lobby__hint">{hint}</p>}
        {isHost ? (
          <button className="btn is-red" disabled={!canStart} onClick={() => room.dispatch({ type: 'start' })}>
            はじめる！
          </button>
        ) : !me?.ready ? (
          <button className="btn is-red" onClick={onEditPhotos}>
            写真をえらぶ
          </button>
        ) : null}
      </div>
    </main>
  )
}

function Tile({ label, big, onChange, children }: { label: string; big?: boolean; onChange?: () => void; children: React.ReactNode }) {
  return (
    <button className="lobby__tile sticker" onClick={onChange} disabled={!onChange}>
      <span className="lobby__tile-label label">{label}</span>
      <span className={`lobby__tile-value pop ${big ? 'is-big' : ''}`}>{children}</span>
      {onChange && <span className="lobby__tile-change">› 変更</span>}
    </button>
  )
}
