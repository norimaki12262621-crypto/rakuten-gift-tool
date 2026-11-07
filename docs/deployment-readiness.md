# SNS商品画像 自動収集：公開準備と本番確認手順

## 今回の範囲

コードの整理・コミット・専用ブランチへのGitHub反映、Vercel向けビルド設定、ローカルの実API検証まで。
本番ブランチへのmerge、Vercel CLIのdeploy、DashboardのDeploy/Redeploy、APIキーの変更は行わない。

`vercel.json` の `git.deploymentEnabled: false` でGit自動デプロイを停止する。mainは変更せず専用ブランチでレビューする。
本番公開の承認後にこの停止設定を意図的に解除する。`scripts/verify-release.cjs` にも停止設定の検査があるため、解除時は検査方針を一緒に更新し、再テストする。

## Vercelの設定

| 項目 | 必要値 | 確認状況 |
|---|---|---|
| Git repository | norimaki12262621-crypto/rakuten-gift-tool | Gitのoriginで確認 |
| Production Branch | Dashboardで現行設定を確認。今回の作業ブランチを指定しない | アカウント設定は未確認 |
| Root Directory | このリポジトリのルート | 必要設定を確認 |
| Framework Preset | Other（framework: null） | vercel.jsonに設定 |
| Node.js | 24.x | package.json enginesに固定、同じバージョンでローカル検証 |
| Install Command | npm ci --ignore-scripts | vercel.jsonに設定 |
| Build Command | npm run build | vercel.jsonに設定、ローカル成功 |
| Output Directory | public | vercel.jsonに設定、公開ファイル検査成功 |
| Functions | api/*.js、最大30秒 | vercel.jsonに設定 |
| 自動デプロイ | 停止 | git.deploymentEnabled: false |

このタスクにはVercelの接続ツール・認証変数・ローカルproject linkがないため、Dashboard上の現在値、環境変数の登録状況、プラン固有制約は読めていない。設定済みとは主張しない。Vercelの実ビルド・本番確認も承認後に行う。

### 環境変数

VercelのProject Settings → Environment Variablesで以下をサーバー用に設定する。値をコード・チャット・manifestへ記載しない。

| 変数 | 用途 | 必須性 |
|---|---|---|
| RAKUTEN_APPLICATION_ID | 楽天アプリケーションID | API検索に必須 |
| RAKUTEN_ACCESS_KEY | 楽天アクセスキー | API検索に必須 |
| RAKUTEN_AFFILIATE_ID | アフィリエイトURL生成 | アフィリエイト機能を利用する本番では必須 |

Productionと、承認後に作成するPreview環境の両方に必要。VITE_/NEXT_PUBLIC_などの公開用接頭辞は付けない。
クラウド開発用のNODE_USE_ENV_PROXYやHTTP_PROXYをVercelへコピーしない。
.env.localはGit/Vercelへのアップロード対象外。現在のローカル検証はこのファイルを使用しており、Vercel側へ自動登録はしていない。

楽天アプリに登録された許可条件・キーの有効性も確認する。既存実装のOrigin/Refererはrakuten-gift-tool.vercel.appを維持している。

### 公開対象と制約

- buildはindex.html、collector.html、assets/だけをpublicへコピーする。環境ファイル、ソースのlib、docs、tests、旧index (1).htmlは公開しない。
- api/とlib/はVercelのサーバー関数として別途バンドルされる。
- worker/WASM/英語・日本語モデルはビルド時に固定npmパッケージから生成。WASMと.gzのContent-Typeを設定。
- Vercelの応答サイズ上限に余裕を持たせるため、画像プロキシは3MiBまでに制限する。超過時は413を表示し、大サイズ取得を外してAPI元サイズで再試行する。
- モデル・画像の初期ロードとOCRには時間がかかる。進捗・中止・手動確認を使用する。
- API取得はSNS転載許諾ではない。確認画面の公式規約・取得元の条件を確認してから外部利用する。外部共有URLや公開画像ストレージは生成しない。

## 承認前のローカル確認

```sh
npm ci --ignore-scripts
npm test
npm run verify:release
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
# .env.localのサーバー変数を設定済みの状態で
NODE_USE_ENV_PROXY=1 npm run preview:build
```

画面はランキングから「SNS商品画像 自動収集」へ移動する。Vercel固有の実行環境を起動したことにはならない。

## 承認後の本番確認手順（今回は未実施）

1. Vercel Dashboardの本番ブランチ・上記設定・3つの変数が正しいことを確認する。値をスクリーンショットやログへ出さない。
2. デプロイ承認を確認し、Git自動デプロイ停止の解除・検査方針の更新をレビューする。承認されたコミットだけを本番へ反映する。
3. ビルドログにnpm ci、OCRアセット生成、public生成の成功があることを確認する。キー値がログへ出ていないことを確認する。
4. `/` で既存ランキングを実行し、取得件数・カード・商品リンクを確認する。
5. ランキングから `/collector.html` へ移動する。JS、CSS、worker、WASM、eng/jpnモデルが200で読み込まれ、画像・モデルがHTMLのfallbackレスポンスになっていないことをDevToolsで確認する。
6. 商品名「3Dボリューミンググロス」、ブランド「fwee」、以下を1行ずつ入力。在庫切れを含め、1検索15商品で開始する。

```text
B02 ソルベ 70%
B03 キャンディー 70%
B08 ロージー 70%
B09 ライチ 70%
```

7. 商品・複数ショップ・画像・解像度・補助評価・OCR状態を確認する。読めない色は「要確認」のままであり、別色や30％画像は不一致/未採用になることを確認する。
8. 候補の本体と商品ページを確認する。B02/B08/B09はpurecoの番号入り画像、B03はj-cosme23のB03/キャンディー/70%入り画像をローカルで確認したが、カタログ変更や在庫変化があり得るため、本番でも画像を再確認する。取得元と画像・価格を別商品から混ぜない。
9. 手動確認画面で実画像の表記を転記して採用する。確認できない画像を確定しない。3色のpureco価格は在庫切れ参考値、共通ページのB03価格・在庫は未確認と区別する。
10. Instagram 4:5を選び、採用内容・利用条件を確認したうえでZIP保存する。4画像、manifest.json、collection-report.json、README.txtが含まれることを確認する。
11. manifestの色コード、色名、ファイル名、商品URL、画像URL、HTTP/解像度/確認方法を照合する。各ファイルのSHA-256がmanifestと一致し、画像が再描画・切抜き・ロゴ除去されていないことを確認する。API認証値・rafcidを含まないことを確認する。
12. TikTok 9:16でもmanifestの比率が変わり、元画像自体が変わらないことを確認する。未確定の色があるとZIPが無効であること、取得失敗が明示されることを確認する。
13. スマホ幅で候補選択・出典展開・ダウンロードを確認する。
14. 旧TikTok手動選択・5枚プレビューとランキングも再確認し、問題があれば前の正常Deploymentへ戻す（新たなデプロイ・rollbackも承認された手順だけで行う）。

## GitHub Actions

SNS collector checksはキー不要の単体・ビルド検査・技術用画像/OCRフィクスチャのブラウザテストを実行する。本番デプロイのstepはない。
既存Rakuten API probeはGitHub Secretsの同名変数がある場合だけ実APIを使う。未設定の場合はnoticeを出してスキップする。スキップは実API検証成功ではない。
GitHub上の実行結果はpush後のActions画面で確認する。今回の実API確認はローカルで別途実施したもの。
