// 名前（と招待コード）を入れる画面。Figma には無いので、01 の見た目に合わせた仮
import { useState } from 'react'
import Header from '../components/Header.tsx'
import './Entry.css'

type Props = {
  mode: 'create' | 'join' | 'solo'
  initialCode?: string
  error?: string
  onBack: () => void
  onSubmit: (name: string, code: string) => void
}

export function savedName() {
  try {
    return localStorage.getItem('calojack-name') ?? ''
  } catch {
    return ''
  }
}

export default function Entry({ mode, initialCode = '', error, onBack, onSubmit }: Props) {
  const [name, setName] = useState(savedName)
  const [code, setCode] = useState(initialCode)
  const okName = name.trim().length > 0
  const okCode = mode !== 'join' || /^\d{4}$/.test(code)

  function submit() {
    if (!okName || !okCode) return
    try {
      localStorage.setItem('calojack-name', name.trim())
    } catch {
      /* 保存できなくても続ける */
    }
    onSubmit(name.trim(), code)
  }

  const title = mode === 'join' ? '部屋に入る' : mode === 'solo' ? 'コンピュータとあそぶ' : '部屋をつくる'

  return (
    <main className="entry">
      <Header title={title} onBack={onBack} />
      <div className="entry__body">
        {mode === 'join' && (
          <label className="entry__box sticker is-yellow">
            <span className="label">招待コード（4けた）</span>
            <input
              className="entry__code pop"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              autoFocus={!initialCode}
            />
          </label>
        )}
        <label className="entry__box sticker">
          <span className="label">あなたの名前</span>
          <input
            className="entry__name"
            maxLength={8}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：はやし"
            autoFocus={mode !== 'join' || !!initialCode}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <span className="entry__hint">みんなの画面に出ます（8文字まで）</span>
        </label>
        {error && <p className="entry__error">{error}</p>}
      </div>
      <div className="entry__foot">
        <button className="btn is-red" disabled={!okName || !okCode} onClick={submit}>
          {mode === 'join' ? '入る！' : mode === 'solo' ? 'はじめる！' : '部屋をつくる！'}
        </button>
      </div>
    </main>
  )
}
