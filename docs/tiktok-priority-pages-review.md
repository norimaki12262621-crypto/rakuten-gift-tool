# 指定3ページの楽天API画像確認

商品ページのHTML・画像はスクレイピングしていない。楽天APIのショップ内検索結果に含まれるitemUrlの遷移先を指定URLと照合した。3ページとも複数色の共通レコード。画像を00・01・03へ個別割当てできる根拠は不足している。

## grandberry

商品ページ: https://item.rakuten.co.jp/grandberry/c37841/

API商品コード: grandberry:10004028

商品名: 【2024年リニューアル・国内正規品】コスメデコルテ ルース パウダー　00・01・02・03・04・05・06・07・101（全9色）20g　COSME DECORTE

### grandberry-1

本体は大きいが、箱・正規品バナー・ショップロゴあり。単色確定不可。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/06443450/08725025/37841-3.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/06443450/08725025/37841-3.jpg?_ex=600x600

### grandberry-2

00表記は確認できるが外箱のみ。不採用。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/06443450/08725025/37841-5.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/06443450/08725025/37841-5.jpg?_ex=600x600

### grandberry-3

保管方法の説明。本体なし。不採用。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/08732282/grandberry_kaki.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/grandberry/cabinet/08732282/grandberry_kaki.jpg?_ex=600x600

## pureco

商品ページ: https://item.rakuten.co.jp/pureco/sku-p-0000000001/

API商品コード: pureco:10093437

商品名: コスメデコルテ ルース パウダー 20g 16g 選べるカラー 全9色 | COSME DECORTE フェイスパウダー ルースパウダー #101 #00 #01 #02 #03 #04 #05 #06 #07 おしろい 透明感 ツヤ肌 毛穴カバー 崩れにくい

### pureco-1

本体は大きいがショップロゴ・販促文字あり。全色共通画像。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001.jpg?_ex=600x600

### pureco-2

色見本一覧。00・01・03の色名確認用。本体画像として不採用。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001_2.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001_2.jpg?_ex=600x600

### pureco-3

本体中心でロゴ・バナーなし。ただし2商品が並び、色番号が特定できないため保留。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001_3.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/pureco/cabinet/sku-p/sku-p-0000000001_3.jpg?_ex=600x600

## cosmeparfaite

商品ページ: https://item.rakuten.co.jp/cosmeparfaite/decorte_powder02/

API商品コード: cosmeparfaite:10012997

商品名: 【エントリーでP10倍】コスメデコルテ ルース パウダー 16g/20g 全9色 選べるカラー #00 #01 #02 #03 #04 #05 #06 #07 #101 フェイスパウダー おしろい ルースパウダー パフ付き DECORTE 宅配便 再入荷11

### cosmeparfaite-1

本体は大きいが箱・ショップロゴ・ポイントバナーあり。全色共通画像。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/batch/202611_1/orte_powder02-b2611.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/batch/202611_1/orte_powder02-b2611.jpg?_ex=600x600

### cosmeparfaite-2

本体が主役で明るい。商品説明文字あり。複数色・複数商品イメージのため単色用途は保留。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/imag/ecorte_powder02c2.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/imag/ecorte_powder02c2.jpg?_ex=600x600

### cosmeparfaite-3

本体と特徴説明。ショップロゴあり。単色確定不可。

HTTP: 200

API返却画像URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/imag/ecorte_powder02c3.jpg?_ex=128x128

同一画像の600px指定URL: https://thumbnail.image.rakuten.co.jp/@0_mall/cosmeparfaite/cabinet/imag/ecorte_powder02c3.jpg?_ex=600x600

## 選定結果

指定ページ由来の画像は3色それぞれの色番を確定できないため、単色用への新規採用なし。既存のwj-yakugyoの色確認済み00・01・03画像を維持。5枚デザイン制作・デプロイは未実施。
