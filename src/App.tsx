import { useState } from 'react'
import Start from './screens/Start.tsx'

type Screen = 'start'

export default function App() {
  const [screen] = useState<Screen>('start')

  return (
    <div className="app">
      {screen === 'start' && <Start onCreate={() => {}} onJoin={() => {}} />}
    </div>
  )
}
