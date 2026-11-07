# fwee 4色・楽天API拡張調査

## 結果

4色とも本体画像・色番号の対応を目視確認した採用候補が見つかった。AI描き直し・文字削除・別色への転用・API以外からの画像取得は実施していない。

確認日時: 2026-11-05T23:30:16.594Z（UTC）

API検索19リクエスト。検索結果から同一商品を除いて145商品・46ショップを抽出。うち対象候補24商品・58画像を追加で目視比較。

検索条件：availability=0で在庫切れも含め、3Dボリューミンググロス、fweeと英語色名（sorbet/candy/rozy/rosy/lychee）、フィーと日本語色名、fwee グロス 70、purecoショップ内 fwee グロスを使用。商品名の検索は6ページ、70検索は3ページを確認。広すぎる日本語の一般検索は先頭30件を確認し、対象商品名で絞り込んだ。

## 採用候補

### B02 ソルベ 70%

画像内の「B02」と単色商品名「B02 ソルベ 70%」を照合。
400×400px・ショップロゴあり。削除・加工せず表示。

商品名: fwee(フィー) 3D ボリューミング グロス 5.3g #B02 ソルベ 70%
商品コード: pureco:10086580
商品URL: https://item.rakuten.co.jp/pureco/prc-s-8654952863/
API掲載価格: ¥1,600
APIでは在庫切れ。表示価格は在庫切れレコードの参考掲載価格。
API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-865000/prc-s-8654952863.jpg?_ex=128x128
同一画像のサイズ指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-865000/prc-s-8654952863.jpg?_ex=1000x1000
実画像解像度: 400×400px、HTTP 200

### B03 キャンディー 70%

画像内に「B03 キャンディー 70%」と明記。商品名も同一商品。
600×600px・販促バナーとショップロゴなし。色名・70％の説明文字あり。

商品名: fwee フィー 3Dボリューミンググロス 5.3g 韓国コスメ 【★定形外送料無料】
商品コード: j-cosme23:10003200
商品URL: https://item.rakuten.co.jp/j-cosme23/fwee_rip3/
API掲載価格: ¥1,630
共通ページは在庫あり。B03単色の在庫・販売価格は未確認。
API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/j-cosme23/cabinet/koreaother/fwee_rip3_02.jpg?_ex=128x128
同一画像のサイズ指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/j-cosme23/cabinet/koreaother/fwee_rip3_02.jpg?_ex=1000x1000
実画像解像度: 600×600px、HTTP 200

### B08 ロージー 70%

画像内の「B08」と単色商品名「B08 ロージー 70%」を照合。
400×400px・ショップロゴあり。削除・加工せず表示。

商品名: fwee (フィー) 3D ボリューミング グロス 5.3g #B08 ロージー 70%
商品コード: pureco:10093458
商品URL: https://item.rakuten.co.jp/pureco/prc-s-8727798629/
API掲載価格: ¥1,485
APIでは在庫切れ。表示価格は在庫切れレコードの参考掲載価格。
API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-872000/prc-s-8727798629.jpg?_ex=128x128
同一画像のサイズ指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-872000/prc-s-8727798629.jpg?_ex=1000x1000
実画像解像度: 400×400px、HTTP 200

### B09 ライチ 70%

画像内の「B09」と単色商品名「B09 ライチ 70%」を照合。
400×400px・ショップロゴあり。削除・加工せず表示。

商品名: fwee (フィー) 3D ボリューミング グロス 5.3g #B09 ライチ 70%
商品コード: pureco:10093462
商品URL: https://item.rakuten.co.jp/pureco/prc-s-8727808636/
API掲載価格: ¥1,375
APIでは在庫切れ。表示価格は在庫切れレコードの参考掲載価格。
API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-872000/prc-s-8727808636.jpg?_ex=128x128
同一画像のサイズ指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/prc-s-872000/prc-s-8727808636.jpg?_ex=1000x1000
実画像解像度: 400×400px、HTTP 200

## 公式共通素材

公式APIの3画像は共通画像・色見本・30％紹介。対象4色がそろった本体画像は確認できず、単色用にも転用しない。

## 制約

purecoのB02・B08・B09は400px角の画像でショップロゴがあるが、本体が主役で画像内の色番号と単色商品名・70%が対応しているため採用候補とした。ロゴは削除していない。3色ともAPI上で在庫切れのため、価格は参考掲載価格であり購入可能価格とは断定しない。

B03はj-cosme23の共通商品ページの3枚目。画像内にB03・キャンディー・70%が明記され、本体が大きくロゴ・販促バナーはない。共通ページの掲載価格は1,630円だがB03の販売価格・在庫は未確認。別ショップの価格と混ぜていない。

4色の画像の色・構図を加工して統一せず、取得元画像をそのまま比較画面に表示。デザイン制作・デプロイ・既存機能コードの変更なし。

## ブラウザ確認

4色画像・色番号・色名・解像度・URL・価格在庫注意表示・出典の展開・スマホ390px幅・58画像ギャラリーを確認。JavaScriptエラーなし。

成果物: /workspace/rakuten-gift-tool-local/fwee-expanded-comparison/index.html。画像・URL・根拠は同フォルダのdata.json、全候補はall-candidates.html、持ち運び用ZIPはfwee-expanded-comparison.zip。
