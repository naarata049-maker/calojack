// Calojack の写真から「料理名」と「カロリー」を予想するサーバー
// ブラウザに APIキーを置かないために、間にこの Worker をはさむ
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

type Env = {
  ANTHROPIC_API_KEY: string
  ALLOWED_ORIGINS: string
  MODEL: string
}

const Guess = z.object({
  is_food: z.boolean().describe('写真に食べ物や飲み物が写っているか'),
  name: z.string().describe('料理名。日本語で短く（例：牛丼、しょうゆラーメン、カフェラテ）。食べ物でなければ空'),
  kcal: z.number().int().describe('写っている1人前のおおよそのカロリー（kcal）。食べ物でなければ0'),
})

const SYSTEM = `あなたは食事の写真を見て、料理名とカロリーの目安を答えます。
- 写っている量を1人前として、よくある日本の外食・市販品の値を目安に、10kcal単位で答えてください。
- 複数の料理が写っているときは、まとめて1つの名前（例：「からあげ定食」）と合計カロリーにしてください。
- 食べ物や飲み物が写っていないときは is_food を false にしてください。`

const MAX_BASE64 = 400_000 // 360px の JPEG なら 100KB 前後。大きすぎる送信ははねる

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    const cors: Record<string, string> = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
      : {}
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403)
    if (req.method !== 'POST') return json({ error: 'method' }, 405)

    let image = ''
    try {
      const body = (await req.json()) as { image?: unknown }
      image = typeof body.image === 'string' ? body.image : ''
    } catch {
      return json({ error: 'body' }, 400)
    }
    const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
    if (!m || m[2].length > MAX_BASE64) return json({ error: 'image' }, 400)

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    try {
      const res = await client.messages.parse({
        model: env.MODEL,
        max_tokens: 2000,
        output_config: { effort: 'low', format: zodOutputFormat(Guess) },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: m[1] as 'image/jpeg', data: m[2] } },
              { type: 'text', text: 'この写真の料理名とカロリーを教えてください。' },
            ],
          },
        ],
      })
      const out = res.parsed_output
      if (res.stop_reason === 'refusal' || !out) return json({ error: 'no_answer' }, 502)
      if (!out.is_food) return json({ food: false })
      const kcal = Math.max(0, Math.min(3000, Math.round(out.kcal / 10) * 10))
      return json({ food: true, name: out.name.slice(0, 20), kcal })
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429)
      if (e instanceof Anthropic.APIError) return json({ error: 'api', status: e.status }, 502)
      return json({ error: 'unknown' }, 500)
    }
  },
}
