# Calojack

撮りためたごはんで、カロリーの大きさを知るカードゲーム。

- 食事のカードは＋、運動のカードは−。目標（1日の消費の目安 2,300kcal）にいちばん近づけた人の勝ち
- ブラックジャックのように、最初の2枚を見てチップを賭け、引くか、やめるかを選ぶ
- カロリーが見えない「ハテナ」は、全員がやめたあと一斉にめくる

## 開発

```
npm install
npm run dev      # http://localhost:5173/calojack/
npm run build    # docs/ に書き出す（GitHub Pages の main /docs で公開）
```

Vite + React + TypeScript。色と文字の決まりは `src/index.css` の `:root`（Figma「カロリーゲーム」ページの決定版から）。
ゲームの進め方は `src/game/engine.ts`（部屋をつくった人のスマホが親になって進める）。
