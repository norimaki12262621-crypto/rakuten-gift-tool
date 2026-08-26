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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });
    const html = await r.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const raw = (ogMatch && ogMatch[1]) || (titleMatch && titleMatch[1]) || '';
    const title = raw.trim();
    if (!title) {
      res.status(200).json({
        title: '',
        debug: { status: r.status, finalUrl: r.url, length: html.length, snippet: html.slice(0, 300) },
      });
      return;
    }
    res.status(200).json({ title });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
