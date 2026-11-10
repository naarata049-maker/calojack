// 04 チップを賭ける・05 引くか、やめるか・06 めくって、ラウンドの結果（Figma 408:1514 / 408:1594 / 426:1977）
// 上はラウンド・目標・自分のチップ、真ん中のミントのテーブルに相手・山札・自分の手札、下に操作
import { useState } from 'react'
import Card, { Deck, formatKcal } from '../components/Card.tsx'
import Chip from '../components/Chip.tsx'
import { MAX_HAND } from '../game/cards.ts'
import { RANK_MULTIPLIERS, canDouble, handTotal, maxBet, visibleTotal } from '../game/engine.ts'
import type { GameState, HandCard, Player } from '../game/types.ts'
import type { Photos, Room } from '../net/room.ts'
import './Table.css'

type Props = { room: Room; state: GameState; photos: Photos }

export default function Table({ room, state, photos }: Props) {
  const me = state.players.find((p) => p.id === room.me)!
  const others = state.players.filter((p) => p.id !== room.me)
  const opened = state.phase === 'result'
  const shownTotal = opened ? handTotal(me.hand) : visibleTotal(me.hand)
  const hasHidden = !opened && me.hand.some((c) => c.hidden)

  return (
    <main className={`table is-${state.phase}`}>
      <div className="table__top">
        <span className="table__pill">
          ラウンド {state.round}/{state.settings.rounds}
        </span>
        <span className="table__pill is-wide pop">
          <small className="label">目標</small> {state.settings.target.toLocaleString()}
          <small>kcal</small>
        </span>
        <span className="table__pill is-chips pop">
          <Chip size={20} /> {me.chips}
        </span>
      </div>

      <section className="table__felt">
        <div className={`table__others is-${others.length}`}>
          {others.map((p) => (
            <Opponent key={p.id} p={p} state={state} />
          ))}
        </div>

        {opened ? (
          <div className="table__open">
            <p className="table__open-title pop">せーの、オープン！</p>
            <p className="table__open-sub label">ハテナがめくれて、合計が決まった</p>
          </div>
        ) : (
          <div className="table__deck">
            <Deck width={67} count={state.deck.length} />
          </div>
        )}

        <Hand hand={me.hand} opened={opened} photos={photos} />

        <div className="table__sum sticker">
          <span className="table__sum-label">{opened ? '合計' : '見えている合計'}</span>
          <span className={`table__sum-value pop ${shownTotal < 0 ? 'is-minus' : ''}`}>
            {shownTotal < 0 ? '−' : ''}
            {formatKcal(shownTotal)}
            <small>kcal</small>
            {hasHidden && <span className="table__sum-q">＋？</span>}
          </span>
          {me.bet > 0 && (
            <span className="table__sum-bet pop">
              <Chip size={20} /> {me.bet}
            </span>
          )}
        </div>
      </section>

      {state.phase === 'betting' && <BetControls room={room} state={state} me={me} />}
      {state.phase === 'playing' && <PlayControls room={room} me={me} />}
      {state.phase === 'result' && <RoundResult room={room} state={state} />}
    </main>
  )
}

function Opponent({ p, state }: { p: Player; state: GameState }) {
  let status = '考え中…'
  let yellow = false
  if (state.phase === 'betting' && p.status === 'bet') {
    status = `${p.bet}枚 賭けた`
    yellow = true
  } else if (state.phase === 'playing') {
    if (p.status === 'stood') status = p.doubled ? 'ダブルダウン' : 'やめた'
    else if (p.draws > 0) status = `${p.draws}枚 引いた`
    yellow = p.status === 'stood' || p.draws > 0
  } else if (state.phase === 'result') {
    const total = handTotal(p.hand)
    status = `${total < 0 ? '−' : ''}${formatKcal(total)}kcal`
  }
  return (
    <div className="opp sticker">
      <span className="opp__avatar" style={{ background: p.color }} />
      <div className="opp__info">
        <p className="opp__name label">
          {p.name}
          {p.bet > 0 && (
            <span className="opp__bet pop">
              <Chip size={13} /> {p.bet}
            </span>
          )}
        </p>
        <span className={`opp__status ${yellow ? 'is-yellow' : ''}`}>{!p.connected ? '通信待ち…' : status}</span>
      </div>
      <span className="opp__cards" aria-label={`${p.hand.length}枚`}>
        <i />
        <i />
        <b>{p.hand.length}</b>
      </span>
    </div>
  )
}

/** 自分の手札。枚数で大きさと並べ方を変える（2枚は大きく、6枚以上は2段） */
function Hand({ hand, opened, photos }: { hand: HandCard[]; opened: boolean; photos: Photos }) {
  const n = hand.length
  const width = opened ? (n <= 3 ? 84 : n <= 4 ? 70 : 64) : n <= 2 ? 104 : n <= 3 ? 76 : n <= 4 ? 72 : n <= 6 ? 64 : 56
  const rows = n <= (opened ? 4 : 3) ? [hand] : [hand.slice(0, Math.ceil(n / 2)), hand.slice(Math.ceil(n / 2))]
  const tilts = [6, -5, 4, -3, 5, -4, 3]
  let k = 0
  return (
    <div className={`hand is-${rows.length}row`}>
      {rows.map((row, r) => (
        <div className="hand__row" key={r}>
          {row.map((c) => {
            const i = k++
            return (
              <div className="hand__card" key={c.id}>
                <Card card={c} width={width} tilt={tilts[i % tilts.length]} opened={opened} photos={photos} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function BetControls({ room, state, me }: { room: Room; state: GameState; me: Player }) {
  const limit = maxBet(me)
  const [amount, setAmount] = useState(Math.min(3, limit))
  const mult = RANK_MULTIPLIERS[state.players.length] ?? RANK_MULTIPLIERS[4]
  if (me.status !== 'betting') {
    return (
      <div className="controls">
        <p className="controls__title pop">{me.bet}枚 賭けた！</p>
        <p className="controls__wait">ほかの人が賭けるのを待っています</p>
      </div>
    )
  }
  return (
    <div className="controls">
      <p className="controls__title pop">何枚 賭ける？</p>
      <div className="bet__chips">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`bet__chip pop ${n === amount ? 'is-on' : ''}`}
            disabled={n > limit}
            onClick={() => setAmount(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="bet__note">
        手持ち {me.chips}枚 → 賭けたあと {me.chips - amount}枚
      </p>
      <div className="bet__ranks">
        {mult.map((m, i) => (
          <span key={i} className={`bet__rank ${m > 0 ? 'is-up' : m < 0 ? 'is-down' : ''}`}>
            {i + 1}位 {m > 0 ? `+${m * amount}` : m < 0 ? `−${-m * amount}` : '±0'}
          </span>
        ))}
      </div>
      <button className="btn is-red controls__main" onClick={() => room.dispatch({ type: 'bet', amount })}>
        {amount}枚 賭ける！
      </button>
    </div>
  )
}

function PlayControls({ room, me }: { room: Room; me: Player }) {
  const [help, setHelp] = useState(false)
  if (me.status !== 'playing') {
    return (
      <div className="controls">
        <p className="controls__title pop">{me.doubled ? 'ダブルダウン！' : 'やめた！'}</p>
        <p className="controls__wait">みんながやめるのを待っています。全員そろったら一斉にめくります</p>
      </div>
    )
  }
  const full = me.hand.length >= MAX_HAND
  const showDouble = me.draws === 0
  const doubleOk = canDouble(me)
  return (
    <div className="controls">
      <p className="controls__title pop">あなたのターン</p>
      <div className="play__row">
        <button className={`btn play__draw ${showDouble ? '' : 'is-wide'}`} disabled={full} onClick={() => room.dispatch({ type: 'draw' })}>
          {full ? 'もう引けない' : 'もう1枚引く'}
        </button>
        {showDouble && (
          <div className="play__double">
            <button className="play__help pop" onClick={() => setHelp(!help)} aria-label="ダブルダウンとは">
              ？
            </button>
            {help && <p className="play__bubble">賭けるチップの枚数を2倍にできるが、1枚しか引くことができない</p>}
            <button className="btn is-ink" disabled={!doubleOk} onClick={() => room.dispatch({ type: 'double' })}>
              ダブルダウン
            </button>
            {!doubleOk && <span className="play__short">チップが足りない</span>}
          </div>
        )}
      </div>
      <button className="btn is-yellow controls__main" onClick={() => room.dispatch({ type: 'stand' })}>
        やめる
      </button>
    </div>
  )
}

function RoundResult({ room, state }: { room: Room; state: GameState }) {
  const last = state.round >= state.settings.rounds
  return (
    <div className="controls is-result">
      <p className="result__title label">ラウンド {state.round} の結果</p>
      <ol className="result__list">
        {state.results.map((r) => {
          const p = state.players.find((x) => x.id === r.playerId)!
          const mine = p.id === room.me
          return (
            <li key={r.playerId} className={`result__row sticker ${r.rank === 1 && !r.over ? 'is-top' : ''}`}>
              <span className="result__rank pop">{r.rank}</span>
              <span className="result__avatar" style={{ background: p.color }} />
              <span className="result__name label">
                {mine ? 'あなた' : p.name}
                {r.over && <small>オーバー</small>}
              </span>
              <span className={`result__total pop ${r.over ? 'is-over' : ''}`}>
                {r.total < 0 ? '−' : ''}
                {formatKcal(r.total)}
                <small>kcal</small>
              </span>
              {!r.over && <span className="result__diff">差 {formatKcal(state.settings.target - r.total)}</span>}
              <span className={`result__delta pop ${r.delta > 0 ? 'is-up' : r.delta < 0 ? 'is-down' : ''}`}>
                {r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `−${-r.delta}` : '±0'}
                <small>枚</small>
              </span>
            </li>
          )
        })}
      </ol>
      {room.isHost ? (
        <button className="btn is-red controls__main" onClick={() => room.dispatch({ type: 'nextRound' })}>
          {last ? '最終結果へ！' : '次のラウンドへ！'}
        </button>
      ) : (
        <p className="controls__wait">部屋をつくった人が次へ進めます</p>
      )}
    </div>
  )
}
