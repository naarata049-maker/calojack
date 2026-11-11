// ゲームの決まりで使う型

export type ExerciseKind = 'walk' | 'run' | 'cycle' | 'muscle' | 'swim'

export type Card = {
  id: string
  kind: 'food' | 'exercise'
  name: string
  /** カロリーの大きさ（食事は＋、運動は−として足す。ここは常に正の数） */
  kcal: number
  /** 食事の写真（小さくした data URL か、見本写真のURL） */
  photo?: string
  /** 運動の種類（アイコン用） */
  exercise?: ExerciseKind
  /** 写真を入れた人 */
  owner?: string
}

/** 手札の1枚。ハテナかどうかはラウンドごとに決まる */
export type HandCard = Card & { hidden: boolean }

export type PlayerStatus =
  | 'betting'   // 何枚賭けるか考え中
  | 'bet'       // 賭けた（ほかの人を待っている）
  | 'playing'   // 引くか、やめるか
  | 'stood'     // やめた

export type Player = {
  id: string
  name: string
  color: string
  isCpu: boolean
  /** 山札に入れる写真のカード */
  photos: Card[]
  ready: boolean
  connected: boolean
  chips: number
  /** このラウンドで賭けた枚数（ダブルダウンしたら2倍） */
  bet: number
  hand: HandCard[]
  status: PlayerStatus
  /** このラウンドで引いた回数（ダブルダウンは最初の判断のときだけ） */
  draws: number
  doubled: boolean
}

export type Settings = {
  target: number
  rounds: number
  startChips: number
}

export type RoundResult = {
  playerId: string
  total: number
  over: boolean
  rank: number
  /** チップの増減（賭けた枚数×順位の倍率） */
  delta: number
}

export type Phase =
  | 'lobby'     // 01 友達を集める・02 写真を選ぶ
  | 'deck'      // 03 山札が完成
  | 'betting'   // 04 チップを賭ける
  | 'playing'   // 05 引くか、やめるか
  | 'result'    // 06 めくって、ラウンドの結果
  | 'final'     // 07 最終結果

export type GameState = {
  code: string
  hostId: string
  settings: Settings
  players: Player[]
  phase: Phase
  round: number
  deck: Card[]
  /** 山札の内訳（03で見せる） */
  deckInfo: { owner: string | null; count: number }[]
  results: RoundResult[]
  /** このゲームでめくったハテナ（07で見せる） */
  revealed: HandCard[]
  /** ゲームの始めのチップ（07の「10枚 → 18枚」用） */
  firstChips: Record<string, number>
  /** 引くか、やめるかを選んでいる人（1人ずつ順番） */
  turn: string | null
  /** ひとつ前の人がしたこと */
  lastAction: { playerId: string; type: 'draw' | 'double' | 'stand'; card?: HandCard } | null
  /** 引いたカードをみんなに見せている間（このあと親が次の人の番にする） */
  showing?: boolean
}

export type Action =
  | { type: 'join'; name: string }
  | { type: 'setPhotos'; photos: Card[] }
  | { type: 'setReady'; ready: boolean }
  | { type: 'setSettings'; settings: Partial<Settings> }
  | { type: 'addCpu' }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'start' }
  | { type: 'deal' }
  | { type: 'bet'; amount: number }
  | { type: 'draw' }
  | { type: 'double' }
  | { type: 'stand' }
  /** 引いたカードを見せ終わって、次の人の番へ（親だけ） */
  | { type: 'advance' }
  | { type: 'nextRound' }
  | { type: 'playAgain' }
