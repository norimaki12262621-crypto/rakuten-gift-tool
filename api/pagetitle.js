module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  let { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'urlパラメータが必要です' });
    return;
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    const html = await r.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const raw = (ogMatch && ogMatch[1]) || (titleMatch && titleMatch[1]) || '';
    res.status(200).json({ title: raw.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
