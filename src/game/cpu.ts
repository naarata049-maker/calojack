// コンピュータの相手の考え方（親のスマホで動く）
import { canDouble, maxBet, visibleTotal } from './engine'
import type { Action, GameState } from './types'

/** ハテナのカードは、だいたいこれくらいだろうと見積もる */
const GUESS = { food: 450, exercise: 200 }

export function decideCpu(s: GameState, cpuId: string): Action | null {
  const p = s.players.find((x) => x.id === cpuId)
  if (!p || !p.isCpu) return null

  if (s.phase === 'betting' && p.status === 'betting') {
    // 2枚を見て、よさそうなら多めに賭ける
    const est = estimate(p.hand)
    const room = s.settings.target - est
    let amount = 2 + Math.floor(Math.random() * 2)
    if (room > 900 && room < 1700) amount += 1
    if (room < 300) amount -= 1
    return { type: 'bet', amount: Math.max(1, Math.min(maxBet(p), amount)) }
  }

  if (s.phase === 'playing' && p.status === 'playing' && s.turn === p.id) {
    const room = s.settings.target - estimate(p.hand)
    if (canDouble(p) && room > 500 && room < 800 && Math.random() < 0.5) return { type: 'double' }
    if (room > 600) return { type: 'draw' }
    if (room > 300) return Math.random() < 0.35 ? { type: 'draw' } : { type: 'stand' }
    return { type: 'stand' }
  }
  return null
}

function estimate(hand: GameState['players'][number]['hand']) {
  return (
    visibleTotal(hand) +
    hand.filter((c) => c.hidden).reduce((sum, c) => sum + (c.kind === 'food' ? GUESS.food : -GUESS.exercise), 0)
  )
}
