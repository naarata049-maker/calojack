// 02 カードをつくる（Figma 417:68）：写真を選んで、料理名をつける
import { useRef, useState } from 'react'
import Card from '../components/Card.tsx'
import Header from '../components/Header.tsx'
import Sheet from '../components/Sheet.tsx'
import { newId } from '../game/cards.ts'
import { FOODS, type Food } from '../game/foods.ts'
import { SAMPLE_FOODS } from '../game/samples.ts'
import type { Card as CardData } from '../game/types.ts'
import { shrinkPhoto } from '../net/image.ts'
import { photoUrl, type Photos as PhotoMap } from '../net/room.ts'
import './Photos.css'

const MAX_PHOTOS = 10

type Props = {
  initial: CardData[]
  photos: PhotoMap
  onBack: () => void
  onDone: (cards: CardData[]) => void
}

export default function Photos({ initial, photos, onBack, onDone }: Props) {
  // 受け取った写真（ref:）は data URL に戻しておく
  const [cards, setCards] = useState<CardData[]>(() => initial.map((c) => ({ ...c, photo: photoUrl(c, photos) })))
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const unnamed = cards.filter((c) => !c.name)

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setLoading(true)
    const room = MAX_PHOTOS - cards.length
    const list = Array.from(files).slice(0, room)
    const added: CardData[] = []
    for (const f of list) {
      try {
        added.push({ id: newId('f'), kind: 'food', name: '', kcal: 0, photo: await shrinkPhoto(f) })
      } catch {
        /* 読めない写真は飛ばす */
      }
    }
    setLoading(false)
    setCards((now) => [...now, ...added])
    // 1枚目の名前を続けて選べるように
    if (added[0]) setEditing(added[0].id)
  }

  function useSamples() {
    setCards(SAMPLE_FOODS.map((c) => ({ ...c, id: newId('f') })))
  }

  function setFood(id: string, food: Food) {
    setCards((now) => now.map((c) => (c.id === id ? { ...c, name: food.name, kcal: food.kcal } : c)))
    // 名前がまだの次の写真へ
    const nextUnnamed = cards.find((c) => c.id !== id && !c.name)
    setEditing(nextUnnamed ? nextUnnamed.id : null)
  }

  const editingCard = cards.find((c) => c.id === editing)

  return (
    <main className="photos">
      <Header title="カードをつくる" onBack={onBack} />
      <div className="photos__body">
        <p className="photos__lead label">山札に入れる写真を えらんでね</p>
        <button className="photos__pick sticker pop" onClick={() => fileRef.current?.click()} disabled={cards.length >= MAX_PHOTOS}>
          <span className="photos__pick-icon" aria-hidden="true" />
          {loading ? '読みこみ中…' : '写真フォルダから選ぶ'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="photos__row">
          <p className="label">選んだ写真（{cards.length}枚）</p>
          {cards.length > 0 ? (
            <button className="photos__reset" onClick={() => setCards([])}>
              選びなおす ›
            </button>
          ) : (
            <button className="photos__reset" onClick={useSamples}>
              見本の写真をつかう ›
            </button>
          )}
        </div>
        <ul className="photos__grid">
          {cards.map((c) => (
            <li key={c.id} className="photos__thumb">
              <button className="photos__thumb-img" onClick={() => setEditing(c.id)}>
                <img src={c.photo} alt={c.name || '名前がまだの写真'} />
                <span className={`photos__thumb-name ${c.name ? '' : 'is-empty'}`}>{c.name || '料理名をえらぶ'}</span>
              </button>
              <button
                className="photos__remove"
                aria-label="外す"
                onClick={() => setCards((now) => now.filter((x) => x.id !== c.id))}
              >
                ×
              </button>
            </li>
          ))}
          {cards.length < MAX_PHOTOS && (
            <li className="photos__thumb">
              <button className="photos__add pop" onClick={() => fileRef.current?.click()} aria-label="写真を足す">
                ＋
              </button>
            </li>
          )}
        </ul>

        {cards.length > 0 && (
          <>
            <p className="photos__arrow label">▼ カードになる</p>
            <div className="photos__cards">
              {cards.map((c, i) => (
                <Card
                  key={c.id}
                  card={{ ...c, name: c.name || '？' }}
                  unknown
                  width={66}
                  tilt={[-6, 4, -3, 6, -5, 3, -2][i % 7]}
                  className="photos__card"
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="photos__foot">
        {unnamed.length > 0 && <p className="photos__hint">料理名がまだの写真が {unnamed.length}枚 あります</p>}
        <button className="btn is-red" disabled={cards.length === 0 || unnamed.length > 0} onClick={() => onDone(cards)}>
          {cards.length}枚を山札に入れる！
        </button>
      </div>

      {editingCard && <NameSheet card={editingCard} onClose={() => setEditing(null)} onPick={(f) => setFood(editingCard.id, f)} />}
    </main>
  )
}

/** 料理名をえらぶシート（一覧から選ぶか、名前とカロリーを入れる） */
function NameSheet({ card, onClose, onPick }: { card: CardData; onClose: () => void; onPick: (f: Food) => void }) {
  const [query, setQuery] = useState(card.name)
  const [kcal, setKcal] = useState(card.kcal ? String(card.kcal) : '')
  const [manual, setManual] = useState(false)
  const q = query.trim()
  const list = q ? FOODS.filter((f) => f.name.includes(q)) : FOODS
  const okManual = q.length > 0 && Number(kcal) > 0 && Number(kcal) <= 3000

  return (
    <Sheet onClose={onClose}>
      <div className="namesheet">
        <div className="namesheet__top">
          <img className="namesheet__img" src={card.photo} alt="" />
          <div>
            <p className="namesheet__title pop">これは何？</p>
            <p className="namesheet__sub">料理名を選ぶと、だいたいのカロリーが入ります。カロリーはゲームの中でわかります</p>
          </div>
        </div>
        <input
          className="namesheet__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="料理名でさがす（例：ラーメン）"
          maxLength={14}
        />
        {!manual ? (
          <>
            <ul className="namesheet__list">
              {list.map((f) => (
                <li key={f.name}>
                  <button onClick={() => onPick(f)}>{f.name}</button>
                </li>
              ))}
              {list.length === 0 && <li className="namesheet__none">見つかりませんでした</li>}
            </ul>
            <button className="btn is-small" onClick={() => setManual(true)}>
              リストにないので、自分で入れる
            </button>
          </>
        ) : (
          <div className="namesheet__manual">
            <label>
              <span className="label">だいたいのカロリー</span>
              <span className="namesheet__kcal">
                <input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="500" />
                kcal
              </span>
            </label>
            <button className="btn is-red" disabled={!okManual} onClick={() => onPick({ name: q, kcal: Number(kcal) })}>
              これにする
            </button>
            <button className="namesheet__back" onClick={() => setManual(false)}>
              ‹ リストから選ぶ
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
