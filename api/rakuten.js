module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { keyword, itemCode, shopCode, minPrice, maxPrice, sort, hits, page } = req.query;

  const params = new URLSearchParams({
    applicationId: '9a9bb16b-a393-414a-ad63-ea58ecf01daa',
    accessKey: 'pk_utmSC6YohMKR5EE6CDCiuC06NbdYwptCTfGFsk3LZhd',
    affiliateId: '534cdfaf.e35a1702.534cdfb0.c0ce9a58',
    format: 'json',
    imageFlag: 1,
  });

  if (itemCode) {
    // 商品コード指定検索。sort や価格帯など他の絞り込み条件を併用すると
    // 楽天API側で "itemCode is not valid" として弾かれるため単独で送る。
    params.set('itemCode', itemCode);
  } else if (shopCode) {
    // ショップ内検索。keyword を補わない（URL から商品を特定する用途のため）
    params.set('shopCode', shopCode);
    params.set('hits', hits || 30);
    if (page) params.set('page', page);
    if (keyword) params.set('keyword', keyword);
    if (sort) params.set('sort', sort);
  } else {
    params.set('hits', hits || 30);
    params.set('sort', sort || '-reviewCount');
    params.set('keyword', keyword || '母の日 プレゼント');
    params.set('minPrice', minPrice || 3000);
    params.set('maxPrice', maxPrice || 7000);
  }

  // itemCode の "ショップコード:商品コード" の区切りコロンは、%3A にエンコードすると
  // 楽天API側で "itemCode is not valid" になるためリテラルのまま送る。
  const qs = params.toString().replace(/%3A/g, ':');
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${qs}`;

  try {
    const r = await fetch(url, {
      headers: {
        'Origin': 'https://rakuten-gift-tool.vercel.app',
        'Referer': 'https://rakuten-gift-tool.vercel.app/',
      }
    });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
