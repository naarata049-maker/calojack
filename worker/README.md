# calojack-ai（写真からカロリーを予想するサーバー）

Calojack のページは GitHub Pages（だれでも中身が見える）なので、AIのキーをページに置けません。
そこで、キーをこの小さなサーバー（Cloudflare Workers・無料枠）にだけ置き、ページは写真をここへ送って答えをもらいます。

- 受けつけるのは `ALLOWED_ORIGINS` に書いた場所から開いたページだけ
- 写真は 360px に縮めたものだけ（大きいものははねる）
- モデルは `MODEL`（はじめは claude-haiku-5-5。1枚 0.01〜0.02円くらい）

## 公開のしかた（Cloudflare の画面だけでできる）

1. Cloudflare の「Workers & Pages」→「作成」→「リポジトリをインポート」で `naarata049-maker/calojack` を選ぶ
2. ルートディレクトリを `worker` にして、デプロイ
3. できた Worker の「設定」→「変数とシークレット」で `ANTHROPIC_API_KEY` を **シークレット** として追加
4. 表示された `https://calojack-ai.<名前>.workers.dev` をページ側の `VITE_AI_URL`（`.env.production`）に入れる

## 手元で動かす

```
cd worker
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars   # git には入らない
npx wrangler dev
```
