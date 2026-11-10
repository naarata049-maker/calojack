// 初めての1回だけ出る吹き出し（Figma「C 初めての1回だけ出る吹き出し」C-1〜C-4）
// 照らしたい場所を黄色の点線で囲み、その上か下に吹き出しを出す。
// 「OK」でその吹き出しは次から出なくなり、同じ画面の次の吹き出しへ。「もう出さない」で吹き出しを全部止める。
import { useLayoutEffect, useRef, useState } from 'react'
import './Coach.css'

export type CoachStep = {
  key: string
  text: string
  /** 囲む場所（CSSセレクタ。いくつか書くと全部をまとめて囲む） */
  targets: string[]
  /** 吹き出しを出す側 */
  place: 'above' | 'below'
}

const SEEN = 'calojack.tips.seen'
const OFF = 'calojack.tips.off'

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN) ?? '[]')
  } catch {
    return []
  }
}
function tipsOff() {
  try {
    return localStorage.getItem(OFF) === '1'
  } catch {
    return false
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 保存できなくても、この回は閉じる */
  }
}

type Box = { top: number; left: number; width: number; height: number }

/** 親（position: relative の画面）の中に置く。照らす場所は親の中から探す */
export default function Coach({ steps }: { steps: CoachStep[] }) {
  const selfRef = useRef<HTMLDivElement>(null)
  // まだ見ていない吹き出しだけを順に出す
  const [queue, setQueue] = useState<CoachStep[]>(() => (tipsOff() ? [] : steps.filter((s) => !readSeen().includes(s.key))))
  const step = queue[0]
  const [box, setBox] = useState<Box | null>(null)
  const [rootH, setRootH] = useState(0)

  useLayoutEffect(() => {
    if (!step) return setBox(null)
    const root = selfRef.current?.parentElement
    if (!root) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      const rects = step.targets
        .map((sel) => root.querySelector(sel)?.getBoundingClientRect())
        .filter((x): x is DOMRect => !!x && x.width > 0)
      if (!rects.length) return setBox(null)
      const top = Math.min(...rects.map((x) => x.top)) - r.top
      const left = Math.min(...rects.map((x) => x.left)) - r.left
      const bottom = Math.max(...rects.map((x) => x.bottom)) - r.top
      const right = Math.max(...rects.map((x) => x.right)) - r.left
      const pad = 6
      setBox({ top: top - pad, left: Math.max(4, left - pad), width: Math.min(r.width - 8, right - left + pad * 2), height: bottom - top + pad * 2 })
      setRootH(r.height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    const t = setTimeout(measure, 300)
    return () => {
      ro.disconnect()
      clearTimeout(t)
    }
  }, [step])

  if (!step || !box) return <div ref={selfRef} hidden />

  function ok() {
    save(SEEN, JSON.stringify([...new Set([...readSeen(), step.key])]))
    setQueue((q) => q.slice(1))
  }
  function never() {
    save(OFF, '1')
    setQueue([])
  }

  const center = box.left + box.width / 2
  const bubbleStyle =
    step.place === 'above' ? { bottom: rootH - box.top + 14 } : { top: box.top + box.height + 14 }
  const arrowStyle =
    step.place === 'above'
      ? { top: box.top - 22, left: center - 8 }
      : { top: box.top + box.height + 6, left: center - 8 }

  return (
    <div ref={selfRef} className="coach" role="dialog" aria-label="ヒント">
      <div className="coach__ring" style={box} />
      <span className="coach__arrow" style={arrowStyle} />
      <div className="coach__bubble" style={bubbleStyle}>
        <p className="coach__text">{step.text}</p>
        <div className="coach__row">
          <button className="coach__never" onClick={never}>
            もう出さない
          </button>
          <button className="coach__ok pop" onClick={ok}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
