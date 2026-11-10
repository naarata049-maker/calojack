import { useSyncExternalStore } from 'react'
import type { Room } from './room'

/** 部屋の状態が変わるたびに画面を描き直す */
export function useRoom(room: Room) {
  const version = useSyncExternalStore(
    (fn) => room.subscribe(fn),
    () => snapshot(room),
  )
  return version
}

const cache = new WeakMap<Room, { key: unknown[]; value: ReturnType<typeof make> }>()

function make(room: Room) {
  return { state: room.getState(), photos: room.getPhotos(), ...room.getStatus() }
}

function snapshot(room: Room) {
  const key = [room.getState(), room.getPhotos(), room.getStatus().status, room.getStatus().message]
  const hit = cache.get(room)
  if (hit && hit.key.every((k, i) => k === key[i])) return hit.value
  const value = make(room)
  cache.set(room, { key, value })
  return value
}
