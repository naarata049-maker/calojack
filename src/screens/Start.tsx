// はじめの画面（Figmaの決定版には無いので仮。ロゴ＋部屋をつくる／コードで入る）
import { LogoMark } from '../components/Logo.tsx'
import './Start.css'

type Props = {
  onCreate: () => void
  onJoin: () => void
  onSolo: () => void
}

export default function Start({ onCreate, onJoin, onSolo }: Props) {
  return (
    <main className="start">
      <div className="start__hero">
        <LogoMark size={150} />
        <h1 className="start__name pop">Calojack</h1>
        <p className="start__lead label">撮りためたごはんで、<br />カロリーの大きさを知るカードゲーム</p>
      </div>

      <div className="start__table sticker">
        <p className="start__rule">
          目標の <b className="pop">2,250</b><small>kcal</small> に<br />いちばん近づけた人の勝ち！
        </p>
        <div className="start__signs">
          <span className="start__sign is-red pop">ごはん ＋</span>
          <span className="start__sign is-blue pop">運動 −</span>
          <span className="start__sign is-yellow pop">？</span>
        </div>
      </div>

      <div className="start__buttons">
        <button className="btn is-red" onClick={onCreate}>部屋をつくる</button>
        <button className="btn" onClick={onJoin}>招待コードで入る</button>
        <button className="start__solo" onClick={onSolo}>ひとりで、コンピュータとあそぶ ›</button>
      </div>
    </main>
  )
}
