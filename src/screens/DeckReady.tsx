// 03 山札が完成（Figma 417:119）
import { useEffect, useRef, useState } from 'react'
import Card, { Deck } from '../components/Card.tsx'
import type { GameState } from '../game/types.ts'
import type { Photos, Room } from '../net/room.ts'
import './DeckReady.css'

// まわりに散らすカードの位置（Figma に合わせた、テーブルの中の左上からの位置と傾き）
const SPOTS = [
  { x: 8, y: 22, r: 10 },
  { x: 136, y: 10, r: -4 },
  { x: 258, y: 18, r: -10 },
  { x: 14, y: 172, r: 6 },
  { x: 262, y: 186, r: 10 },
  { x: 20, y: 312, r: -6 },
  { x: 268, y: 304, r: 6 },
]

export default function DeckReady({ room, state, photos }: { room: Room; state: GameState; photos: Photos }) {
  // 食事を先に、運動もまぜて7枚だけ見せる
  const foods = state.deck.filter((c) => c.kind === 'food')
  const exercises = state.deck.filter((c) => c.kind === 'exercise')
  const shown = [foods[0], foods[1], foods[2], exercises[0], foods[3], exercises[1], exercises[2]].filter(Boolean)

  const nameOf = (owner: string | null) => {
    if (owner === null) return '運動カード'
    if (owner === 'sample') return '見本の写真'
    const p = state.players.find((x) => x.id === owner)
    return p ? `${p.id === room.me ? 'あなた' : p.name}の写真` : '写真'
  }
  const colorOf = (owner: string | null) => {
    if (owner === null) return 'var(--blue)'
    if (owner === 'sample') return 'var(--yellow)'
    return state.players.find((x) => x.id === owner)?.color ?? 'var(--ink)'
  }

  // テーブルは空いている高さに合わせて縮める（中身は 353×418 の舞台を拡大縮小）
  const tableRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setScale(Math.min(el.clientWidth / 353, el.clientHeight / 418, 1.2))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <main className="deckready">
      <h1 className="deckready__title pop">山札が完成！</h1>
      <p className="deckready__sub pop">みんなの写真と運動カードをまぜたよ</p>
      <div className="deckready__table" ref={tableRef}>
        <div className="deckready__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {shown.map((c, i) => (
          <div key={c.id} className="deckready__spot" style={{ left: SPOTS[i].x, top: SPOTS[i].y }}>
            <Card card={c} unknown width={72} tilt={SPOTS[i].r} photos={photos} />
          </div>
        ))}
        <div className="deckready__deck">
          <Deck width={108} />
          <p className="deckready__count pop">
            {state.deck.length}
            <small>枚</small>
          </p>
        </div>
        </div>
      </div>

      <section className="deckready__list sticker">
        <p className="label">山札の中身</p>
        <ul>
          {state.deckInfo
            .filter((d) => d.count > 0)
            .map((d) => (
              <li key={d.owner ?? 'ex'}>
                <span className="deckready__dot" style={{ background: colorOf(d.owner) }} />
                <span>{nameOf(d.owner)}</span>
                <b className="pop">
                  {d.count}
                  <small>枚</small>
                </b>
              </li>
            ))}
        </ul>
      </section>

      <div className="deckready__foot">
        {room.isHost ? (
          <button className="btn is-red" onClick={() => room.dispatch({ type: 'deal' })}>
            カードを配る！
          </button>
        ) : (
          <p className="deckready__wait">部屋をつくった人がカードを配ります</p>
        )}
      </div>
    </main>
  )
}
