try { process.loadEnvFile?.(require('node:path').join(__dirname, '..', '.env.local')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
// URL のスラッグ（例: t-interior/hps05）から商品を特定できるか検証する。
// GitHub Actions 上で実行し、ログで結果を確認する。
const APP_ID = process.env.RAKUTEN_APPLICATION_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const AFF_ID = process.env.RAKUTEN_AFFILIATE_ID;
if (!APP_ID || !ACCESS_KEY) { console.error('RAKUTEN_APPLICATION_ID と RAKUTEN_ACCESS_KEY をサーバー環境変数に設定してください'); process.exit(1); }
const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(shopCode, page) {
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    affiliateId: AFF_ID,
    format: 'json',
    shopCode,
    hits: 30,
    page,
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${ENDPOINT}?${params}`, {
      headers: {
        Origin: 'https://rakuten-gift-tool.vercel.app',
        Referer: 'https://rakuten-gift-tool.vercel.app/',
      },
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* noop */ }
    if (data && Array.isArray(data.Items)) return data;
    if (r.status === 429) { await sleep(1500); continue; }
    console.log(`  page${page} 失敗 status=${r.status} ${text.slice(0, 120)}`);
    return null;
  }
  console.log(`  page${page} レート制限で断念`);
  return null;
}

// APIが返す itemUrl はアフィリエイト形式で、実URLが pc= に
// パーセントエンコードされて埋め込まれている。デコードしてから照合する。
function urlMatches(itemUrl, want) {
  let u = itemUrl || '';
  for (let i = 0; i < 2; i++) {
    try { u = decodeURIComponent(u); } catch (e) { break; }
  }
  return u.toLowerCase().includes(want);
}

async function findBySlug(shopCode, slug, maxPages) {
  const want = `/${shopCode}/${slug}/`.toLowerCase();
  let scanned = 0;
  for (let p = 1; p <= maxPages; p++) {
    const data = await fetchPage(shopCode, p);
    if (!data) return;
    const items = data.Items.map((i) => i.Item || i);
    if (!items.length) { console.log(`  page${p} で商品終わり（計${scanned}件）`); break; }
    scanned += items.length;
    const hit = items.find((i) => urlMatches(i.itemUrl, want));
    if (hit) {
      console.log(`  ★一致 page=${p} scanned=${scanned} itemCode=${hit.itemCode}`);
      console.log(`   name=${String(hit.itemName).slice(0, 60)} price=${hit.itemPrice}`);
      return;
    }
    await sleep(400);
  }
  console.log(`  一致なし（${scanned}件確認）`);
}

(async () => {
  console.log('=== t-interior / hps05 ===');
  await findBySlug('t-interior', 'hps05', 34);

  console.log('=== beautypalace / flower60 ===');
  await findBySlug('beautypalace', 'flower60', 34);
})();
