// ロゴ（Figma 453:2 P2「黄色の背景・ハテナも黄」）
// 後ろの青＝運動の−、前の赤＝食事の＋、黄色のハテナ。文字は Dela Gothic One
import './Logo.css'
import markUrl from './logo-mark.svg'

/** 2枚のカードのマーク（背景なし） */
export function LogoMark({ size = 64 }: { size?: number }) {
  return <img className="logo-mark" src={markUrl} width={size * 120 / 116} height={size} alt="" />
}

/** 横組み（マーク＋Calojack） */
export function LogoWide({ height = 56 }: { height?: number }) {
  return (
    <div className="logo-wide" style={{ height, fontSize: height * 0.5 }}>
      <LogoMark size={height} />
      <span className="logo-wide__name">Calojack</span>
    </div>
  )
}
