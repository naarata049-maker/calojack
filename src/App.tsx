import { useState } from 'react'
import Start from './screens/Start.tsx'
import CardSamples from './screens/CardSamples.tsx'

type Screen = 'start' | 'cards'

export default function App() {
  const [screen] = useState<Screen>(() => (location.search.includes('cards') ? 'cards' : 'start'))

  return (
    <div className="app">
      {screen === 'start' && <Start onCreate={() => {}} onJoin={() => {}} />}
      {screen === 'cards' && <CardSamples />}
    </div>
  )
}
