import { useEffect, useState } from 'react'
import Start from './screens/Start.tsx'
import Entry from './screens/Entry.tsx'
import Lobby from './screens/Lobby.tsx'
import Photos from './screens/Photos.tsx'
import DeckReady from './screens/DeckReady.tsx'
import CardSamples from './screens/CardSamples.tsx'
import { GuestRoom, HostRoom, myPlayerId, type Room } from './net/room.ts'
import { useRoom } from './net/useRoom.ts'

type Before = 'start' | 'create' | 'join' | 'solo' | 'cards'

function inviteCode() {
  const m = location.search.match(/room=(\d{4})/)
  return m ? m[1] : ''
}

export default function App() {
  const [before, setBefore] = useState<Before>(() =>
    location.search.includes('cards') ? 'cards' : inviteCode() ? 'join' : 'start',
  )
  const [room, setRoom] = useState<{ room: Room; online: boolean } | null>(null)
  const [error, setError] = useState<string>()

  function leave() {
    room?.room.close()
    setRoom(null)
    setBefore('start')
    history.replaceState(null, '', location.pathname)
  }

  return (
    <div className="app">
      {room ? (
        <InRoom room={room.room} online={room.online} onLeave={leave} onError={(m) => {
          room.room.close()
          setRoom(null)
          setError(m)
          setBefore(room.room.isHost ? (room.online ? 'create' : 'solo') : 'join')
        }} />
      ) : before === 'cards' ? (
        <CardSamples />
      ) : before === 'start' ? (
        <Start
          onCreate={() => setBefore('create')}
          onJoin={() => setBefore('join')}
          onSolo={() => setBefore('solo')}
        />
      ) : (
        <Entry
          mode={before}
          initialCode={inviteCode()}
          error={error}
          onBack={() => {
            setError(undefined)
            setBefore('start')
          }}
          onSubmit={(name, code) => {
            setError(undefined)
            const me = myPlayerId()
            if (before === 'join') setRoom({ room: new GuestRoom(me, name, code), online: true })
            else {
              const host = new HostRoom(me, name, { online: before === 'create' })
              if (before === 'solo') {
                host.dispatch({ type: 'addCpu' })
                host.dispatch({ type: 'addCpu' })
              }
              setRoom({ room: host, online: before === 'create' })
            }
          }}
        />
      )}
    </div>
  )
}

function InRoom({ room, online, onLeave, onError }: { room: Room; online: boolean; onLeave: () => void; onError: (m: string) => void }) {
  const { state, photos, status, message } = useRoom(room)
  const [editPhotos, setEditPhotos] = useState(false)
  const me = state?.players.find((p) => p.id === room.me)

  // 部屋に入ったら、まず写真を選ぶ（まだなら）
  useEffect(() => {
    if (state?.phase === 'lobby' && me && !me.ready && me.photos.length === 0) setEditPhotos(true)
  }, [state?.phase, me?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'error' && message) onError(message)
  }, [status, message]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state || !me) {
    return (
      <main className="waiting">
        <p className="pop">{message ?? 'つないでいます…'}</p>
        <button className="btn is-small" onClick={onLeave}>やめる</button>
      </main>
    )
  }

  if (state.phase === 'lobby') {
    if (editPhotos)
      return (
        <Photos
          initial={me.photos}
          photos={photos}
          onBack={() => setEditPhotos(false)}
          onDone={(cards) => {
            room.dispatch({ type: 'setPhotos', photos: cards })
            room.dispatch({ type: 'setReady', ready: true })
            setEditPhotos(false)
          }}
        />
      )
    return <Lobby room={room} state={state} online={online} onEditPhotos={() => setEditPhotos(true)} onLeave={onLeave} />
  }
  if (state.phase === 'deck') return <DeckReady room={room} state={state} photos={photos} />
  return (
    <main className="waiting">
      <p className="pop">ラウンド {state.round}（つくり中）</p>
      <button className="btn is-small" onClick={onLeave}>やめる</button>
    </main>
  )
}
