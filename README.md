# 楽天ギフトランキング / SNS商品画像 自動収集

既存のランキング画面から「SNS商品画像 自動収集」を開けます。収集画面は `/collector.html` です。

## ローカル起動

Node.js 24以降を使用します。

```sh
npm ci
npm run build
# 初回のみ .env.example を .env.local にコピーし、サーバー用の値を設定
NODE_USE_ENV_PROXY=1 npm run dev
```

通常の環境でプロキシが不要な場合は `npm run dev`。ポートは `PORT` で変更できます。
この開発環境には既存の認証情報を `.env.local` として保持済みです。値は画面・ソース・ZIPに含めません。

必要なサーバー環境変数：

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- `RAKUTEN_AFFILIATE_ID`（アフィリエイトURL用）

`.env.local` はGitとVercelのアップロード対象から除外しています。公開先では環境変数を別途設定してください。GitHub Actionsのprobeを使う場合は同名のGitHub Secretsが必要です。キーをチャットや公開ファイルへ貼り付けないでください。

`npm run build` は、固定バージョンのTesseract.js・日本語/英語モデル・WASMとJSZipをローカルの `assets/vendor` に準備します。OCR画像を外部AIサービスへ送信しません。生成アセットはGit管理しません。

## 検証

```sh
npm test
# Chromiumを別途インストール済みの場合
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
# Playwright管理のブラウザを使用する場合
npx playwright install chromium
npm run test:browser
```

使い方・照合の限界・ZIP仕様・実通信の検証結果は [docs/sns-collector.md](docs/sns-collector.md) を参照してください。

Webサイトへのデプロイは実施していません。

## 公開準備（本番デプロイ未実施）

`npm run build` は公開用の `public/` のみを生成します。APIはVercelの `api/` 関数として動作します。
`npm run verify:release` で、公開ファイル・必要アセット・秘密情報混入・Git自動デプロイ停止を検査できます。
`npm run preview:build` で公開予定ビルドをローカル確認できます（先にbuildを実行）。

`vercel.json` はGit自動デプロイを停止しています。専用ブランチへのpushでは本番公開しません。
必要なVercel環境変数・設定・承認後の確認手順は [docs/deployment-readiness.md](docs/deployment-readiness.md) を参照してください。
