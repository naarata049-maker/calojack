// 写真から料理名とカロリーを予想する（AI）。サーバーは worker/ の Cloudflare Worker
// VITE_AI_URL が無いときは使わない（今までどおり一覧から選ぶ）
const AI_URL = (import.meta.env.VITE_AI_URL as string | undefined)?.trim()

export const aiEnabled = Boolean(AI_URL)

export type AiGuess = { name: string; kcal: number }

/** 予想できたら {name,kcal}、食べ物でない・失敗したら null */
export async function guessFood(photo: string): Promise<AiGuess | null> {
  if (!AI_URL) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    const res = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photo }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { food?: boolean; name?: string; kcal?: number }
    if (!data.food || !data.name || !data.kcal) return null
    return { name: data.name, kcal: data.kcal }
  } catch {
    return null
  }
}
