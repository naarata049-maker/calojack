// 07 最終結果（Figma 439:172）
import Card, { formatKcal } from '../components/Card.tsx'
import Chip from '../components/Chip.tsx'
import type { GameState, HandCard } from '../game/types.ts'
import type { Photos, Room } from '../net/room.ts'
import './Final.css'

type Props = { room: Room; state: GameState; photos: Photos; onLeave: () => void }

export default function Final({ room, state, photos, onLeave }: Props) {
  const ranking = [...state.players].sort((a, b) => b.chips - a.chips)
  const top = ranking[0]
  const winners = ranking.filter((p) => p.chips === top.chips)
  const iWon = winners.some((p) => p.id === room.me)
  const nameOf = (id: string) => (id === room.me ? 'あなた' : state.players.find((p) => p.id === id)?.name ?? '')

  // めくったハテナ（同じ名前は1回だけ）。大きい順
  const seen = new Set<string>()
  const learned: HandCard[] = []
  ;[...state.revealed]
    .sort((a, b) => b.kcal - a.kcal)
    .forEach((c) => {
      if (seen.has(c.name)) return
      seen.add(c.name)
      learned.push(c)
    })
  const biggest = learned.find((c) => c.kind === 'food') ?? learned[0]

  let rank = 0
  let prev = Infinity

  return (
    <main className="final">
      <h1 className="final__title pop">ゲーム終了！</h1>
      <p className="final__sub label">{state.settings.rounds}ラウンドの結果</p>

      <section className="final__winner sticker">
        <div className="final__crown">
          <svg width="44" height="26" viewBox="0 0 44 26" aria-hidden="true">
            <path d="M3 24 L6 5 L15 14 L22 2 L29 14 L38 5 L41 24 Z" fill="#fff" stroke="#23233f" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <span className="final__avatar" style={{ background: top.color }} />
        </div>
        <div>
          <p className="final__label label">{winners.length > 1 ? '同点で優勝' : '優勝'}</p>
          <p className="final__who pop">
            {winners.length > 1 ? winners.map((p) => nameOf(p.id)).join('・') : nameOf(top.id)}
            {winners.length === 1 && iWon ? ' の勝ち！' : winners.length === 1 ? ' の勝ち' : ''}
          </p>
          <p className="final__chips pop">
            <Chip size={20} /> チップ {top.chips}枚
          </p>
          <p className="final__from">
            {state.firstChips[top.id] ?? state.settings.startChips}枚 → {top.chips}枚
          </p>
        </div>
      </section>

      <ol className="final__list">
        {ranking.map((p) => {
          if (p.chips !== prev) rank += 1
          prev = p.chips
          const d = p.chips - (state.firstChips[p.id] ?? state.settings.startChips)
          return (
            <li key={p.id} className={`final__row sticker ${rank === 1 ? 'is-top' : ''}`}>
              <span className="final__rank pop">{rank}</span>
              <span className="final__dot" style={{ background: p.color }} />
              <span className="final__name label">{nameOf(p.id)}</span>
              <span className="final__count pop">{p.chips}枚</span>
              <span className="final__delta">{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '±0'}</span>
            </li>
          )
        })}
      </ol>

      {learned.length > 0 && (
        <section className="final__learned">
          <p className="final__learned-title pop">このゲームで知ったカロリー</p>
          <p className="final__learned-sub label">めくったハテナ</p>
          <div className="final__cards">
            {learned.map((c, i) => (
              <Card key={c.id} card={{ ...c, hidden: false }} width={72} tilt={[-5, 4, -3, 5][i % 4]} photos={photos} />
            ))}
          </div>
          {biggest && (
            <div className="final__biggest sticker">
              <p className="final__biggest-label">いちばん大きかったハテナ</p>
              <p className={`final__biggest-name pop ${biggest.kind === 'exercise' ? 'is-blue' : ''}`}>
                {biggest.name}　{biggest.kind === 'food' ? '+' : '−'}
                {formatKcal(biggest.kcal)}kcal
              </p>
            </div>
          )}
        </section>
      )}

      <div className="final__foot">
        {room.isHost ? (
          <button className="btn is-red" onClick={() => room.dispatch({ type: 'playAgain' })}>
            もう一度あそぶ！
          </button>
        ) : (
          <p className="final__wait">部屋をつくった人が「もう一度」を押すと、続けてあそべます</p>
        )}
        <button className="btn is-small final__end" onClick={onLeave}>
          おわる
        </button>
      </div>
    </main>
  )
}
