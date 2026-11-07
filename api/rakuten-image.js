// Same-origin image delivery for canvas export. Never fetch arbitrary hosts.
module.exports = async function handler(req, res) {
  let url;
  try {
    url = new URL(req.query.url);
    if (url.protocol !== 'https:' || url.hostname !== 'thumbnail.image.rakuten.co.jp' || url.port || url.username || url.password || !url.pathname.startsWith('/@0_mall/')) throw new Error();
  } catch { return res.status(400).json({ error: '楽天APIの商品画像URLを指定してください' }); }
  try {
    const upstream = await fetch(url.href, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return res.status(502).json({ error: '楽天画像の取得に失敗しました', upstreamStatus: upstream.status });
    const type = (upstream.headers.get('content-type') || '').split(';')[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) { await upstream.body?.cancel(); return res.status(502).json({ error: '対応していない画像形式です' }); }
    const reader = upstream.body.getReader(); const chunks = []; let size = 0;
    while (true) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 3 * 1024 * 1024) { await reader.cancel(); return res.status(413).json({error:'画像が3MBを超えています。元のAPI画像サイズで再取得してください'}); } chunks.push(Buffer.from(value)); }
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(Buffer.concat(chunks));
  } catch { return res.status(502).json({ error: '楽天画像に接続できませんでした。再度お試しください' }); }
};
