// 楽天APIの受け付ける呼び出し方を切り分けるための調査スクリプト。
// GitHub Actions 上で実行し、ログで結果を確認する。
const APP_ID = '9a9bb16b-a393-414a-ad63-ea58ecf01daa';
const ACCESS_KEY = 'pk_utmSC6YohMKR5EE6CDCiuC06NbdYwptCTfGFsk3LZhd';
const AFF_ID = '534cdfaf.e35a1702.534cdfb0.c0ce9a58';
const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';

async function probe(label, extra, { literalColon = false } = {}) {
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    affiliateId: AFF_ID,
    format: 'json',
    ...extra,
  });
  let qs = params.toString();
  if (literalColon) qs = qs.replace(/%3A/g, ':');

  try {
    const r = await fetch(`${ENDPOINT}?${qs}`, {
      headers: {
        Origin: 'https://rakuten-gift-tool.vercel.app',
        Referer: 'https://rakuten-gift-tool.vercel.app/',
      },
    });
    const text = await r.text();
    let summary = text.slice(0, 200);
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j.Items)) {
        summary = `Items=${j.Items.length}`;
        const first = j.Items[0] && (j.Items[0].Item || j.Items[0]);
        if (first) summary += ` first.itemCode=${first.itemCode} url=${first.itemUrl}`;
      }
    } catch (e) { /* 非JSONならそのまま先頭を表示 */ }
    console.log(`[${label}] status=${r.status} ${summary}`);
  } catch (e) {
    console.log(`[${label}] THREW ${e.message}`);
  }
}

(async () => {
  console.log('=== itemCode の送り方 ===');
  await probe('A itemCode literal colon', { itemCode: 't-interior:hps05' }, { literalColon: true });
  await probe('B itemCode %3A encoded', { itemCode: 't-interior:hps05' });
  await probe('C itemCode 別商品 literal', { itemCode: 'cosmediva:4971710541328' }, { literalColon: true });

  console.log('=== shopCode 単体で引けるか ===');
  await probe('D shopCode only', { shopCode: 't-interior', hits: 3 });
  await probe('E shopCode + page2', { shopCode: 't-interior', hits: 3, page: 2 });
  await probe('F shopCode + sort', { shopCode: 't-interior', hits: 3, sort: '-reviewCount' });

  console.log('=== 基準（動くはずのキーワード検索） ===');
  await probe('G keyword baseline', { keyword: 'コスメ', hits: 3 });

  console.log('=== 旧エンドポイントとの比較 ===');
  try {
    const p = new URLSearchParams({ applicationId: APP_ID, accessKey: ACCESS_KEY, format: 'json', itemCode: 't-interior:hps05' });
    const r = await fetch(`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?${p.toString().replace(/%3A/g, ':')}`, {
      headers: { Origin: 'https://rakuten-gift-tool.vercel.app', Referer: 'https://rakuten-gift-tool.vercel.app/' },
    });
    console.log(`[H 20260401 itemCode] status=${r.status} ${(await r.text()).slice(0, 200)}`);
  } catch (e) {
    console.log(`[H] THREW ${e.message}`);
  }
})();
