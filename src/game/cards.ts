import type { Card, ExerciseKind } from './types'

// 運動カード（Figma 405:2、60kg目安の仮の数字）。60分はたまに出る大きいカード
export const EXERCISES: { kind: ExerciseKind; name: string; kcal: [number, number, number] }[] = [
  { kind: 'walk', name: '散歩', kcal: [55, 110, 220] },
  { kind: 'run', name: 'ランニング', kcal: [130, 260, 520] },
  { kind: 'cycle', name: 'サイクリング', kcal: [110, 210, 430] },
  { kind: 'muscle', name: '筋トレ', kcal: [80, 160, 320] },
  { kind: 'swim', name: '水泳', kcal: [95, 190, 380] },
]
const MINUTES = [15, 30, 60] as const
// 15分・30分はよく出る、60分はたまに
const MINUTE_WEIGHTS = [4, 4, 1]

/** 食事と運動の割合（4：1） */
export const FOOD_PER_EXERCISE = 4
/** 1人が持てる最大の枚数（最初2枚＋あと5回） */
export const MAX_HAND = 7
/** カードがハテナになる割合 */
export const HIDDEN_RATE = 0.25

let seq = 0
export function newId(prefix = 'c') {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

export function randomExercise(rand = Math.random): Card {
  const e = EXERCISES[Math.floor(rand() * EXERCISES.length)]
  const total = MINUTE_WEIGHTS.reduce((a, b) => a + b, 0)
  let r = rand() * total
  let i = 0
  while (r >= MINUTE_WEIGHTS[i]) {
    r -= MINUTE_WEIGHTS[i]
    i += 1
  }
  return {
    id: newId('e'),
    kind: 'exercise',
    name: `${e.name}${MINUTES[i]}分`,
    kcal: e.kcal[i],
    exercise: e.kind,
  }
}

export function shuffle<T>(list: T[], rand = Math.random): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** カードを足した合計（食事は＋、運動は−） */
export function signedKcal(card: Card) {
  return card.kind === 'food' ? card.kcal : -card.kcal
}
