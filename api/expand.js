module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://rakuten-gift-tool.vercel.app/',
      },
    });

    if (!r.ok && !r.redirected && r.url === url) {
      res.status(502).json({ error: `URLの展開に失敗しました (status: ${r.status})` });
      return;
    }

    res.status(200).json({ url: r.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
