// 画面の上：左に丸い戻るボタン、真ん中に見出し（Figma 01・02）
import './Header.css'

export default function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="header">
      {onBack && (
        <button className="header__back pop" onClick={onBack} aria-label="もどる">
          ‹
        </button>
      )}
      <h1 className="header__title pop">{title}</h1>
    </header>
  )
}
