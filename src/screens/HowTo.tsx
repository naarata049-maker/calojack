// あそびかた（Figma「A案2」A2-1〜A2-3）：はじめの画面の右上「？ あそびかた」から開く
// ① ゴール → ② 手順 → ③ 勝ち方 の3枚。左右にスワイプでも進める
import { useLayoutEffect, useRef, useState } from 'react'
import Card, { Deck } from '../components/Card.tsx'
import { SAMPLE_FOODS } from '../game/samples.ts'
import type { Card as CardData, HandCard } from '../game/types.ts'
import './HowTo.css'

const food = (name: string): CardData => SAMPLE_FOODS.find((c) => c.name === name)!
const gyudon: HandCard = { ...food('牛丼'), hidden: true }
const ramen: HandCard = { ...food('醤油ラーメン'), name: 'ラーメン', hidden: false }
const walk: HandCard = { id: 'h-walk', kind: 'exercise', name: '散歩30分', kcal: 110, exercise: 'walk', hidden: false }

const PEOPLE = [
  { name: 'やまだ', kcal: 2100, color: '#ff5b3a' },
  { name: 'すずき', kcal: 1650, color: '#8fa79b' },
  { name: 'さとう', kcal: 2480, color: '#c9a27e' },
]
const TARGET = 2250
const MAX = 2600
const at = (v: number) => `${(v / MAX) * 100}%`

type Page = { step: string; title: React.ReactNode; body: React.ReactNode; art: React.ReactNode }

const PAGES: Page[] = [
  {
    step: '① ゴール',
    title: (
      <>
        目標の数字に
        <br />
        いちばん近い人が1位
      </>
    ),
    body: (
      <>
        手札の合計が目標に近いほど上の順位。
        <br />
        目標をこえたら<b className="is-red">最下位</b>。
      </>
    ),
    art: <GoalArt />,
  },
  {
    step: '② 手順',
    title: 'カードを引いて近づける',
    body: (
      <>
        1人1枚ずつ、山札から引く。
        <br />
        食べ物は<b className="is-red">＋</b>、運動は<b className="is-blue">−</b>、？は数字が見えないから
        <br />
        予想して「もう1枚」か「やめる」を選ぼう。
        <br />
        「？」の数字は最後にわかるよ。
      </>
    ),
    art: <DrawArt />,
  },
  {
    step: '③ 勝ち方',
    title: '順位でチップが増える',
    body: (
      <>
        目標にいちばん近い人が<b className="is-green">1位</b>、こえたら<b className="is-red">最下位</b>。
        <br />
        最初に賭けたチップは、順位が上ほど<b className="is-green">増える</b>。
        <br />
        決めたラウンドが終わって、
        <br />
        いちばん多い人が<b className="is-red">優勝</b>！
      </>
    ),
    art: <WinArt />,
  },
]

export default function HowTo({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const page = PAGES[i]
  const last = i === PAGES.length - 1
  const touch = useRef<number | null>(null)

  const back = () => (i === 0 ? onClose() : setI(i - 1))
  const next = () => (last ? onClose() : setI(i + 1))

  return (
    <main
      className="howto"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (dx < -50 && !last) setI(i + 1)
        if (dx > 50 && i > 0) setI(i - 1)
      }}
    >
      <header className="howto__head">
        <button className="header__back pop" onClick={back} aria-label="もどる">
          ‹
        </button>
        <h1 className="howto__title pop">あそびかた</h1>
        <button className="howto__close pop" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </header>
      <div className="howto__dots" aria-label={`${i + 1} / ${PAGES.length}`}>
        {PAGES.map((_, k) => (
          <span key={k} className={k === i ? 'is-on' : ''} />
        ))}
      </div>
      <p className="howto__step label">{page.step}</p>

      <FitArt>{page.art}</FitArt>

      <h2 className="howto__heading pop">{page.title}</h2>
      <p className="howto__body">{page.body}</p>

      <div className="howto__foot">
        <button className={`btn ${last ? 'is-yellow' : 'is-red'}`} onClick={next}>
          {last ? 'わかった！' : 'つぎへ'}
        </button>
      </div>
    </main>
  )
}

/** 絵を、画面に残った高さにおさまるように縮める（スクロールさせない） */
function FitArt({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const o = outer.current
    const n = inner.current
    if (!o || !n) return
    const fit = () => {
      const s = Math.min(1, o.clientHeight / n.offsetHeight, o.clientWidth / n.offsetWidth)
      setScale(s > 0 ? s : 1)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(o)
    return () => ro.disconnect()
  }, [children])
  return (
    <div ref={outer} className="howto__fit">
      <div ref={inner} className="howto__art sticker" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

function GoalArt() {
  return (
    <div className="art-goal">
      <p className="howto__pill is-yellow pop">
        目標　{TARGET.toLocaleString()} <small>kcal</small>
      </p>
      <div className="art-goal__line">
        {PEOPLE.map((p) => (
          <span key={p.name} className="art-goal__who" style={{ left: at(p.kcal) }}>
            <small className="label">{p.name}</small>
            <i style={{ background: p.color }} />
          </span>
        ))}
        <div className="art-goal__track">
          <span className="art-goal__over" style={{ left: at(TARGET) }} />
        </div>
        <span className="art-goal__target" style={{ left: at(TARGET) }} />
        <span className="art-goal__out label" style={{ left: at(TARGET) }}>
          こえたら
          <br />
          アウト
        </span>
      </div>
      <ul className="art-rows">
        {[
          ['1位', 'やまだ', '2,100 kcal', 'あと150', 'is-up'],
          ['2位', 'すずき', '1,650 kcal', 'あと600', ''],
          ['最下位', 'さとう', '2,480 kcal', '230こえた', 'is-down'],
        ].map(([r, n, v, d, cls]) => (
          <li key={n} className={`art-rows__row sticker ${cls}`}>
            <b className="pop">{r}</b>
            <span className="label">{n}</span>
            <span className="pop">{v}</span>
            <small>{d}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DrawArt() {
  return (
    <div className="art-draw">
      <div className="art-draw__top">
        <div className="art-draw__deck">
          <span className="art-draw__ripple" />
          <span className="art-draw__ripple is-2" />
          <Deck width={58} />
          <svg className="art-draw__hand" width="40" height="49" viewBox="0 0 44 54" aria-hidden="true">
            <path
              d="M16 4c3 0 5 2 5 5v14l2-1c3-1 5 0 6 2l1 1 2-1c3-1 5 0 6 3l1 1c3-1 5 1 5 4v8c0 8-6 14-14 14h-3c-5 0-9-2-12-6L4 37c-2-2-1-5 1-6 2-2 5-1 7 1l0 0V9c0-3 2-5 4-5z"
              fill="#fff"
              stroke="#23233f"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="howto__pill is-yellow is-small label">1枚引く！</span>
        </div>
        <span className="art-draw__arrow pop">→</span>
        <Card card={gyudon} width={64} tilt={10} />
        <Card card={ramen} width={64} tilt={-4} />
        <Card card={walk} width={64} tilt={4} />
      </div>
      <div className="art-draw__legend">
        <span className="howto__pill is-small label is-red-text">食べ物　＋</span>
        <span className="howto__pill is-small label is-blue-text">運動　−</span>
        <span className="howto__pill is-small is-yellow label">？ 見えない</span>
      </div>
      <p className="howto__pill label">見えている合計　590 kcal ＋ ？</p>
      <p className="art-draw__think label">あと1枚引く？　こえちゃうかも…</p>
      <div className="art-draw__buttons">
        <span className="art-draw__btn pop">もう1枚引く</span>
        <span className="art-draw__btn is-yellow pop">やめる</span>
      </div>
    </div>
  )
}

function WinArt() {
  return (
    <div className="art-win">
      <p className="howto__pill is-yellow label">目標 {TARGET.toLocaleString()} kcal に近い順</p>
      <ul className="art-rows">
        {[
          ['1位', 'やまだ', '2,100 kcal　3枚賭け → ＋3', 'is-up'],
          ['2位', 'すずき', '1,650 kcal　2枚賭け → ±0', ''],
          ['最下位', 'さとう', '2,480 kcal　4枚賭け → −4', 'is-down'],
        ].map(([r, n, t, cls]) => (
          <li key={n} className={`art-rows__row sticker ${cls}`}>
            <b className="pop">{r}</b>
            <span className="label">{n}</span>
            <small>{t}</small>
          </li>
        ))}
      </ul>
      <p className="howto__pill is-small label is-red-text">目標をこえた人は最下位</p>
      <div className="art-win__rounds">
        <span className="howto__pill is-small label">ラウンド1</span>
        <span className="pop">→</span>
        <span className="howto__pill is-small label">ラウンド2</span>
        <span className="pop">→</span>
        <span className="howto__pill is-small label">最後のラウンド</span>
      </div>
      <p className="howto__pill is-red label">チップがいちばん多い人が優勝！</p>
    </div>
  )
}
