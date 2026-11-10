// カード（Figma 決定版のD案ステッカー風。基準 72×100、size で拡大）
// 食事は生成りの地に写真と赤い＋、運動は水色の地にアイコンと青い−。
// ハテナのカードは、めくる前は「+？kcal」と黄色の？、めくった後はオレンジの！
import type { Card as CardData, ExerciseKind, HandCard } from '../game/types'
import walk from '../assets/exercise/walk.svg'
import run from '../assets/exercise/run.svg'
import cycle from '../assets/exercise/cycle.svg'
import muscle from '../assets/exercise/muscle.svg'
import swim from '../assets/exercise/swim.svg'
import deckBack from '../assets/deck.svg'
import { photoUrl, type Photos } from '../net/room'
import './Card.css'

const ICONS: Record<ExerciseKind, string> = { walk, run, cycle, muscle, swim }

type Props = {
  card: CardData | HandCard
  /** カードの幅（px）。高さは 100/72 倍 */
  width?: number
  /** 傾き（度） */
  tilt?: number
  /** ハテナをめくった後か（true なら数字を見せて「！」） */
  opened?: boolean
  /** 写真を入れる画面などで、まだカロリーを見せないとき */
  unknown?: boolean
  className?: string
  /** 写真の置き場（オンラインで受け取った写真） */
  photos?: Photos
}

export function formatKcal(n: number) {
  return Math.abs(n).toLocaleString('ja-JP')
}

export default function Card({ card, width = 72, tilt = 0, opened = false, unknown = false, className = '', photos = {} }: Props) {
  const hidden = 'hidden' in card && card.hidden
  const showNumber = !unknown && (!hidden || opened)
  const src = photoUrl(card, photos)
  const sign = card.kind === 'food' ? '+' : '−'
  return (
    <div
      className={`card is-${card.kind} ${className}`}
      style={{ '--u': `${width / 72}px`, rotate: `${tilt}deg` } as React.CSSProperties}
    >
      <div className="card__face">
        <div className="card__photo">
          {card.kind === 'food' ? (
            src ? <img src={src} alt="" draggable={false} /> : <span className="card__nophoto" />
          ) : (
            <img className="card__icon" src={ICONS[card.exercise ?? 'walk']} alt="" draggable={false} />
          )}
        </div>
        <p className="card__name">{card.name}</p>
        <p className="card__kcal">
          {sign}
          {showNumber ? formatKcal(card.kcal) : '？'}
          <small>kcal</small>
        </p>
        {hidden && !unknown && <span className={`card__badge ${opened ? 'is-open' : ''}`}>{opened ? '！' : '？'}</span>}
      </div>
    </div>
  )
}

/** 山札（裏向きのカードの重なり） */
export function Deck({ width = 67, count }: { width?: number; count?: number }) {
  return (
    <div className="deck">
      <img src={deckBack} width={width} height={(width * 90) / 67} alt="" draggable={false} />
      {count !== undefined && <p className="deck__count label">山札 {count}枚</p>}
    </div>
  )
}
