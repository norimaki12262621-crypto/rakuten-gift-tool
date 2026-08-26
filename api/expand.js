module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const r = await fetch(url, { redirect: 'follow' });
    res.status(200).json({ url: r.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
