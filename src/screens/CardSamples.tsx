// 確認用：カードの見本を並べる（?cards で開く）
import Card, { Deck } from '../components/Card.tsx'
import { SAMPLE_FOODS } from '../game/samples.ts'
import type { HandCard } from '../game/types.ts'

const ex = (name: string, kcal: number, exercise: HandCard['exercise'], hidden = false): HandCard => ({
  id: name, kind: 'exercise', name, kcal, exercise, hidden,
})

export default function CardSamples() {
  const [ramen, donut, teriyaki, toast] = SAMPLE_FOODS
  return (
    <main style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 28, overflowY: 'auto' }}>
      <section style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Card card={{ ...ramen, hidden: true }} width={108} tilt={6} />
        <Card card={{ ...teriyaki, hidden: false }} width={108} tilt={-5} />
        <Deck count={22} />
      </section>
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Card card={{ ...ramen, hidden: true }} opened width={64} tilt={-4} />
        <Card card={{ ...teriyaki, hidden: false }} width={64} tilt={3} />
        <Card card={ex('散歩30分', 110, 'walk')} width={64} tilt={-7} />
        <Card card={{ ...toast, hidden: false }} width={64} tilt={4} />
        <Card card={ex('筋トレ30分', 160, 'muscle', true)} opened width={64} tilt={-3} />
        <Card card={{ ...donut, hidden: false }} width={64} tilt={5} />
      </section>
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Card card={ex('ランニング60分', 520, 'run')} width={72} />
        <Card card={ex('サイクリング30分', 210, 'cycle', true)} width={72} />
        <Card card={ex('水泳15分', 95, 'swim')} width={72} />
        <Card card={{ ...donut }} unknown width={72} />
      </section>
    </main>
  )
}
