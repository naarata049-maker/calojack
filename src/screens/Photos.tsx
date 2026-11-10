// 02 カードをつくる（Figma 417:68）：写真を選んで、料理名をつける
import { useRef, useState } from 'react'
import Card from '../components/Card.tsx'
import Header from '../components/Header.tsx'
import Sheet from '../components/Sheet.tsx'
import { newId } from '../game/cards.ts'
import { FOODS, type Food } from '../game/foods.ts'
import { SAMPLE_FOODS } from '../game/samples.ts'
import type { Card as CardData } from '../game/types.ts'
import { aiEnabled, guessFood, type AiGuess } from '../net/ai.ts'
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
  // AIの予想（写真ごと）。pending＝見ている途中、null＝わからなかった
  const [ai, setAi] = useState<Record<string, AiGuess | 'pending' | null>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const unnamed = cards.filter((c) => !c.name)
  const thinking = cards.filter((c) => ai[c.id] === 'pending').length

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
    if (!aiEnabled) {
      // 1枚目の名前を続けて選べるように
      if (added[0]) setEditing(added[0].id)
      return
    }
    // AIに1枚ずつ見てもらい、わかったら料理名とカロリーを入れておく（あとで直せる）
    setAi((now) => ({ ...now, ...Object.fromEntries(added.map((c) => [c.id, 'pending' as const])) }))
    for (const c of added) {
      guessFood(c.photo!).then((g) => {
        setAi((now) => ({ ...now, [c.id]: g }))
        if (g) setCards((now) => now.map((x) => (x.id === c.id && !x.name ? { ...x, name: g.name, kcal: g.kcal } : x)))
      })
    }
  }

  function useSamples() {
    setCards(SAMPLE_FOODS.map((c) => ({ ...c, id: newId('f') })))
  }

  function setFood(id: string, food: Food) {
    setCards((now) => now.map((c) => (c.id === id ? { ...c, name: food.name, kcal: food.kcal } : c)))
    // 自分で選びなおしたら、AIの印は外す
    setAi((now) => {
      const g = now[id]
      return g && g !== 'pending' && (g.name !== food.name || g.kcal !== food.kcal) ? { ...now, [id]: null } : now
    })
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
                {ai[c.id] === 'pending' && !c.name ? (
                  <span className="photos__thumb-name is-ai">AIが見ています…</span>
                ) : (
                  <span className={`photos__thumb-name ${c.name ? '' : 'is-empty'}`}>
                    {isAi(ai[c.id], c) && <b className="photos__ai">AI</b>}
                    {c.name || '料理名をえらぶ'}
                  </span>
                )}
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
        {thinking > 0 ? (
          <p className="photos__hint">AIが写真を見ています（あと{thinking}枚）</p>
        ) : unnamed.length > 0 ? (
          <p className="photos__hint">料理名がまだの写真が {unnamed.length}枚 あります</p>
        ) : (
          Object.values(ai).some((g) => g && g !== 'pending') && (
            <p className="photos__hint is-ai">AIの予想は、写真をタップすると直せます</p>
          )
        )}
        <button className="btn is-red" disabled={cards.length === 0 || unnamed.length > 0 || thinking > 0} onClick={() => onDone(cards)}>
          {cards.length}枚を山札に入れる！
        </button>
      </div>

      {editingCard && <NameSheet card={editingCard} guess={isAi(ai[editingCard.id], editingCard) ? (ai[editingCard.id] as AiGuess) : null} onClose={() => setEditing(null)} onPick={(f) => setFood(editingCard.id, f)} />}
    </main>
  )
}

function isAi(g: AiGuess | 'pending' | null | undefined, c: CardData) {
  return !!g && g !== 'pending' && g.name === c.name && g.kcal === c.kcal
}

/** 料理名をえらぶシート（一覧から選ぶか、名前とカロリーを入れる） */
function NameSheet({
  card,
  guess,
  onClose,
  onPick,
}: {
  card: CardData
  guess: AiGuess | null
  onClose: () => void
  onPick: (f: Food) => void
}) {
  const [query, setQuery] = useState(guess ? '' : card.name)
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
        {guess && (
          <div className="namesheet__ai sticker">
            <span className="photos__ai">AI</span>
            <span className="namesheet__ai-text">
              AIの予想は<b>「{guess.name}」</b>
              <small>{guess.kcal.toLocaleString()} kcal</small>
            </span>
            <button className="btn is-yellow is-small" onClick={() => onPick(guess)}>
              これでOK
            </button>
          </div>
        )}
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
