export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { keyword, minPrice, maxPrice, sort, hits } = req.query;
  
  const params = new URLSearchParams({
    keyword: keyword || '母の日 プレゼント',
    hits: hits || 30,
    minPrice: minPrice || 3000,
    maxPrice: maxPrice || 7000,
    sort: sort || '-reviewCount',
    formatVersion: 2,
    imageFlag: 1,
    applicationId: '9a9bb16b-a393-414a-ad63-ea58ecf01daa',
  });

  const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
