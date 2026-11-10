// 黄色のチップ（ゲーム内のコイン）
export default function Chip({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        border: `${Math.max(1.5, size / 12)}px solid var(--ink)`,
        background: 'var(--yellow)',
        verticalAlign: 'middle',
      }}
    />
  )
}
