// 01 友達を集める（Figma 417:2）
import { useState } from 'react'
import Header from '../components/Header.tsx'
import Sheet from '../components/Sheet.tsx'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/engine.ts'
import type { GameState, Settings } from '../game/types.ts'
import type { Room } from '../net/room.ts'
import './Lobby.css'

const ROUNDS = [1, 2, 3, 4, 5]
const CHIPS = [5, 10, 15, 20]
// 目標の数字は、厚生労働省「日本人の食事摂取基準（2025年版）」の
// 推定エネルギー必要量（18〜29歳、身体活動レベル 低い／ふつう／高い）から
const TARGETS = [1700, 1950, 2250, 2600, 3000]
const TARGET_NOTES: Record<number, string> = {
  1700: '20代女性・活動量が低い',
  1950: '20代女性・活動量ふつう',
  2250: '20代男性・活動量が低い／20代女性・活動量が高い',
  2600: '20代男性・活動量ふつう',
  3000: '20代男性・活動量が高い',
}
const TARGET_SOURCE = '厚生労働省「日本人の食事摂取基準（2025年版）」推定エネルギー必要量（18〜29歳）'

type Pick = 'target' | 'rounds' | 'startChips'

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
  const [picking, setPicking] = useState<Pick | null>(null)
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
                  {/* ×は押せないボタン（相手のアイコン）の中だと反応しないので、外に置く */}
                  <span className="lobby__avatar-wrap">
                    <button
                      className="lobby__avatar"
                      style={{ background: p.color }}
                      onClick={mine ? onEditPhotos : undefined}
                      disabled={!mine}
                      aria-label={mine ? '写真をえらぶ' : p.name}
                    >
                      {p.isCpu && <span className="lobby__cpu pop">CPU</span>}
                    </button>
                    {isHost && p.isCpu && (
                      <button
                        className="lobby__remove"
                        aria-label={`${p.name}を外す`}
                        onClick={() => room.dispatch({ type: 'removePlayer', playerId: p.id })}
                      >
                        ×
                      </button>
                    )}
                  </span>
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
                {i === 0 ? <span className="lobby__status is-empty">あと{empty}人</span> : <span className="lobby__status is-blank" />}
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
          <Tile label="目標" onChange={isHost ? () => setPicking('target') : undefined}>
            {s.target.toLocaleString()}
            <small>kcal</small>
          </Tile>
          <Tile label="ラウンド" big onChange={isHost ? () => setPicking('rounds') : undefined}>
            {s.rounds}
          </Tile>
          <Tile label="チップ" big onChange={isHost ? () => setPicking('startChips') : undefined}>
            {s.startChips}
            <small>枚</small>
          </Tile>
        </div>
        {TARGET_NOTES[s.target] && (
          <p className="lobby__note">
            <small>目標は</small>
            <span className="lobby__note-who">
              {TARGET_NOTES[s.target].split('／').map((t) => (
                <span key={t}>「{t}」</span>
              ))}
            </span>
            <small>の1日の目安</small>
          </p>
        )}
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

      {picking && (
        <PickSheet
          kind={picking}
          value={s[picking]}
          onPick={(v) => {
            change({ [picking]: v })
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </main>
  )
}

const PICKS: Record<Pick, { title: string; sub: string; list: number[]; unit: string }> = {
  target: { title: '目標', sub: 'この数字に一番近い人が勝ち。こえたら負けです', list: TARGETS, unit: 'kcal' },
  rounds: { title: 'ラウンド', sub: '何回戦あそぶか', list: ROUNDS, unit: '回戦' },
  startChips: { title: 'チップ', sub: 'はじめに配るチップの枚数', list: CHIPS, unit: '枚' },
}

function PickSheet({ kind, value, onPick, onClose }: { kind: Pick; value: number; onPick: (v: number) => void; onClose: () => void }) {
  const p = PICKS[kind]
  return (
    <Sheet onClose={onClose}>
      <div className="picksheet">
        <p className="picksheet__title pop">{p.title}</p>
        <p className="picksheet__sub">{p.sub}</p>
        <ul className={`picksheet__list is-${kind}`}>
          {p.list.map((v) => (
            <li key={v}>
              <button className={`picksheet__opt sticker ${v === value ? 'is-on' : ''}`} onClick={() => onPick(v)} aria-pressed={v === value}>
                <span className="pop">
                  {v.toLocaleString()}
                  <small>{p.unit}</small>
                </span>
                {kind === 'target' && TARGET_NOTES[v] && (
                  <em>
                    {TARGET_NOTES[v].split('／').map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </em>
                )}
              </button>
            </li>
          ))}
        </ul>
        {kind === 'target' && <p className="picksheet__source">出典：{TARGET_SOURCE}</p>}
        <button className="picksheet__close" onClick={onClose}>
          とじる
        </button>
      </div>
    </Sheet>
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
