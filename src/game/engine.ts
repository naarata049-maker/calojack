// ゲームの進め方（部屋をつくった人のスマホ＝親が持つ）。
// apply は「今の状態」と「誰が何をしたか」から次の状態をつくるだけで、画面や通信とは関係しない
import { FOOD_PER_EXERCISE, HIDDEN_RATE, MAX_HAND, newId, randomExercise, shuffle, signedKcal } from './cards'
import type { Action, Card, GameState, HandCard, Player, RoundResult, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = { target: 2300, rounds: 3, startChips: 10 }
export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 2
export const MAX_BET = 5
/** 0枚になったら次のラウンドにもらえる枚数 */
export const REFILL_CHIPS = 3

export const PLAYER_COLORS = ['#ff5b3a', '#8fa79b', '#c9a27e', '#a99be0']
export const CPU_NAMES = ['Aさん', 'Bさん', 'Cさん']

/** 人数ごとの順位の倍率（賭けた枚数×倍率だけ増減） */
export const RANK_MULTIPLIERS: Record<number, number[]> = {
  2: [1, -1],
  3: [1, 0, -1],
  4: [2, 0, -1, -1],
}

export function createGame(code: string, host: { id: string; name: string }): GameState {
  return {
    code,
    hostId: host.id,
    settings: { ...DEFAULT_SETTINGS },
    players: [newPlayer(host.id, host.name, 0, false)],
    phase: 'lobby',
    round: 0,
    deck: [],
    deckInfo: [],
    results: [],
    revealed: [],
    firstChips: {},
    turn: null,
    lastAction: null,
  }
}

function newPlayer(id: string, name: string, index: number, isCpu: boolean): Player {
  return {
    id,
    name,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    isCpu,
    photos: [],
    ready: isCpu,
    connected: true,
    chips: DEFAULT_SETTINGS.startChips,
    bet: 0,
    hand: [],
    status: 'betting',
    draws: 0,
    doubled: false,
  }
}

export type Context = {
  /** 見本の食事カード（コンピュータの写真・足りないときの補充） */
  samples: Card[]
  rand?: () => number
}

/** 手札の合計（ハテナも含めた本当の合計） */
export function handTotal(hand: HandCard[]) {
  return hand.reduce((sum, c) => sum + signedKcal(c), 0)
}

/** 見えている合計（ハテナは数えない） */
export function visibleTotal(hand: HandCard[]) {
  return hand.reduce((sum, c) => sum + (c.hidden ? 0 : signedKcal(c)), 0)
}

export function canDouble(p: Player) {
  return p.status === 'playing' && p.draws === 0 && !p.doubled && p.chips >= p.bet && p.hand.length < MAX_HAND
}

export function maxBet(p: Player) {
  return Math.min(MAX_BET, p.chips)
}

export function apply(state: GameState, playerId: string, action: Action, ctx: Context): GameState {
  const rand = ctx.rand ?? Math.random
  const s: GameState = structuredClone(state)
  const me = s.players.find((p) => p.id === playerId)
  const isHost = playerId === s.hostId

  switch (action.type) {
    case 'join': {
      if (me) {
        me.connected = true
        me.name = action.name || me.name
        return s
      }
      if (s.phase !== 'lobby' || s.players.length >= MAX_PLAYERS) return state
      s.players.push(newPlayer(playerId, action.name, s.players.length, false))
      return s
    }
    case 'setPhotos': {
      if (!me || s.phase !== 'lobby') return state
      me.photos = action.photos.map((c) => ({ ...c, owner: me.id }))
      return s
    }
    case 'setReady': {
      if (!me || s.phase !== 'lobby') return state
      me.ready = action.ready
      return s
    }
    case 'setSettings': {
      if (!isHost || s.phase !== 'lobby') return state
      s.settings = { ...s.settings, ...action.settings }
      return s
    }
    case 'addCpu': {
      if (!isHost || s.phase !== 'lobby' || s.players.length >= MAX_PLAYERS) return state
      const used = new Set(s.players.map((p) => p.name))
      const name = CPU_NAMES.find((n) => !used.has(n)) ?? `CPU${s.players.length}`
      const cpu = newPlayer(newId('cpu'), name, s.players.length, true)
      cpu.photos = shuffle(ctx.samples, rand)
        .slice(0, 7)
        .map((c) => ({ ...c, id: newId('f'), owner: cpu.id }))
      s.players.push(cpu)
      return s
    }
    case 'removePlayer': {
      if (!isHost || s.phase !== 'lobby' || action.playerId === s.hostId) return state
      s.players = s.players.filter((p) => p.id !== action.playerId)
      s.players.forEach((p, i) => (p.color = PLAYER_COLORS[i]))
      return s
    }
    case 'start': {
      // 01→03：山札をつくる
      if (!isHost || s.phase !== 'lobby' || s.players.length < MIN_PLAYERS) return state
      s.players.forEach((p) => {
        p.chips = s.settings.startChips
        p.ready = true
      })
      s.firstChips = Object.fromEntries(s.players.map((p) => [p.id, p.chips]))
      s.round = 0
      s.results = []
      s.revealed = []
      buildDeck(s, ctx, rand)
      s.phase = 'deck'
      return s
    }
    case 'deal': {
      // 03→04：最初のラウンドを配る
      if (!isHost || s.phase !== 'deck') return state
      startRound(s, ctx, rand)
      return s
    }
    case 'bet': {
      if (!me || s.phase !== 'betting' || me.status !== 'betting') return state
      const amount = Math.round(action.amount)
      if (amount < 1 || amount > maxBet(me)) return state
      me.bet = amount
      me.chips -= amount
      me.status = 'bet'
      if (s.players.every((p) => p.status === 'bet')) {
        s.phase = 'playing'
        s.players.forEach((p) => (p.status = 'playing'))
        // 1人ずつ順番に。ラウンドごとに最初の人をずらす
        s.turn = s.players[(s.round - 1) % s.players.length].id
        s.lastAction = null
      }
      return s
    }
    case 'draw': {
      if (!me || s.phase !== 'playing' || me.status !== 'playing' || s.turn !== me.id) return state
      if (me.hand.length >= MAX_HAND) return state
      drawCard(s, me, rand)
      me.draws += 1
      if (me.hand.length >= MAX_HAND) me.status = 'stood'
      s.lastAction = { playerId: me.id, type: 'draw', card: me.hand[me.hand.length - 1] }
      return nextTurn(s)
    }
    case 'double': {
      // 賭けたチップを2倍にして、1枚だけ引く
      if (!me || s.phase !== 'playing' || !canDouble(me) || s.turn !== me.id) return state
      me.chips -= me.bet
      me.bet *= 2
      me.doubled = true
      drawCard(s, me, rand)
      me.draws += 1
      me.status = 'stood'
      s.lastAction = { playerId: me.id, type: 'double', card: me.hand[me.hand.length - 1] }
      return nextTurn(s)
    }
    case 'stand': {
      if (!me || s.phase !== 'playing' || me.status !== 'playing' || s.turn !== me.id) return state
      me.status = 'stood'
      s.lastAction = { playerId: me.id, type: 'stand' }
      return nextTurn(s)
    }
    case 'nextRound': {
      if (!isHost || s.phase !== 'result') return state
      if (s.round >= s.settings.rounds) {
        s.phase = 'final'
        return s
      }
      startRound(s, ctx, rand)
      return s
    }
    case 'playAgain': {
      if (!isHost || s.phase !== 'final') return state
      s.phase = 'lobby'
      s.round = 0
      s.players.forEach((p) => {
        p.hand = []
        p.bet = 0
        p.status = 'betting'
        p.ready = p.isCpu
      })
      return s
    }
  }
}

/** みんなの写真と運動カードで山札をつくる（足りなければ見本の食事と運動で補う） */
function buildDeck(s: GameState, ctx: Context, rand: () => number) {
  const foods: Card[] = s.players.flatMap((p) => p.photos)
  const need = s.players.length * MAX_HAND
  const extraFoods: Card[] = []
  const minFoods = Math.ceil((need * FOOD_PER_EXERCISE) / (FOOD_PER_EXERCISE + 1))
  const pool = shuffle(ctx.samples, rand)
  for (let i = 0; foods.length + extraFoods.length < minFoods; i++) {
    const c = pool[i % pool.length]
    extraFoods.push({ ...c, id: newId('f'), owner: undefined })
  }
  const foodCount = foods.length + extraFoods.length
  let exCount = Math.max(1, Math.round(foodCount / FOOD_PER_EXERCISE))
  if (foodCount + exCount < need) exCount = need - foodCount
  const exercises = Array.from({ length: exCount }, () => randomExercise(rand))
  s.deck = [...foods, ...extraFoods, ...exercises]
  s.deckInfo = [
    ...s.players.map((p) => ({ owner: p.id, count: p.photos.length })),
    ...(extraFoods.length ? [{ owner: 'sample', count: extraFoods.length }] : []),
    { owner: null, count: exercises.length },
  ]
}

/** ラウンドを始める：山札を混ぜ直して2枚ずつ配る（山札は毎ラウンド全部のカードに戻す） */
function startRound(s: GameState, _ctx: Context, rand: () => number) {
  s.round += 1
  s.phase = 'betting'
  s.results = []
  s.turn = null
  s.lastAction = null
  s.deck = shuffle(s.deck.concat(s.players.flatMap((p) => p.hand.map(stripHidden))), rand)
  s.players.forEach((p) => {
    p.hand = []
    if (p.chips <= 0) p.chips = REFILL_CHIPS
    p.bet = 0
    p.status = 'betting'
    p.draws = 0
    p.doubled = false
  })
  for (let i = 0; i < 2; i++) s.players.forEach((p) => drawCard(s, p, rand))
}

function stripHidden(c: HandCard): Card {
  const { hidden: _hidden, ...card } = c
  return card
}

function drawCard(s: GameState, p: Player, rand: () => number) {
  const card = s.deck.shift()
  if (!card) return
  p.hand.push({ ...card, hidden: rand() < HIDDEN_RATE })
}

/** 次の人の番へ（やめた人は飛ばす）。全員やめたら一斉にめくる */
function nextTurn(s: GameState) {
  const n = s.players.length
  const from = s.players.findIndex((p) => p.id === s.turn)
  for (let k = 1; k <= n; k++) {
    const p = s.players[(from + k) % n]
    if (p.status === 'playing') {
      s.turn = p.id
      return s
    }
  }
  s.turn = null
  settle(s)
  return s
}

/** 一斉にめくって、目標に近い順にチップを増減する。目標をこえた人は最下位 */
function settle(s: GameState) {
  const target = s.settings.target
  const n = s.players.length
  const mult = RANK_MULTIPLIERS[n] ?? RANK_MULTIPLIERS[4]
  const rows = s.players.map((p) => {
    const total = handTotal(p.hand)
    const over = total > target
    return { p, total, over, diff: over ? Infinity : target - total }
  })
  const sorted = [...rows].sort((a, b) => a.diff - b.diff || a.total - b.total)
  const results: RoundResult[] = []
  sorted.forEach((r, i) => {
    // 同じ差なら同じ順位。こえた人はみんな最下位
    let rank = i + 1
    if (r.over) rank = n
    else if (i > 0 && sorted[i - 1].diff === r.diff) rank = results[i - 1].rank
    const delta = r.p.bet * mult[rank - 1]
    results.push({ playerId: r.p.id, total: r.total, over: r.over, rank, delta })
  })
  results.forEach((res) => {
    const p = s.players.find((x) => x.id === res.playerId)!
    p.chips += p.bet + res.delta
  })
  s.results = results
  s.revealed.push(...s.players.flatMap((p) => p.hand.filter((c) => c.hidden)))
  s.phase = 'result'
}
