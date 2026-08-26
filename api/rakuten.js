module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { keyword, itemCode, minPrice, maxPrice, sort, hits } = req.query;

  const params = new URLSearchParams({
    applicationId: '9a9bb16b-a393-414a-ad63-ea58ecf01daa',
    accessKey: 'pk_utmSC6YohMKR5EE6CDCiuC06NbdYwptCTfGFsk3LZhd',
    affiliateId: '534cdfaf.e35a1702.534cdfb0.c0ce9a58',
    hits: hits || 30,
    sort: sort || '-reviewCount',
    format: 'json',
    imageFlag: 1,
  });

  if (itemCode) {
    params.set('itemCode', itemCode);
  } else {
    params.set('keyword', keyword || '母の日 プレゼント');
    params.set('minPrice', minPrice || 3000);
    params.set('maxPrice', maxPrice || 7000);
  }

  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`;

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
