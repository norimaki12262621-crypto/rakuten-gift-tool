const ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
function credentials() {
  return {
    applicationId: process.env.RAKUTEN_APPLICATION_ID,
    accessKey: process.env.RAKUTEN_ACCESS_KEY,
    affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
  };
}
function scrub(value, auth = credentials()) {
  if (Array.isArray(value)) return value.map((v) => scrub(v, auth));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !["applicationId", "accessKey"].includes(k))
        .map(([k, v]) => [k, scrub(v, auth)]),
    );
  if (typeof value !== "string") return value;
  if (/^https?:\/\//.test(value)) {
    try {
      const u = new URL(value);
      for (const [key, val] of [...u.searchParams])
        if (
          ["applicationid", "accesskey", "rafcid"].includes(
            key.toLowerCase(),
          ) ||
          [auth.applicationId, auth.accessKey]
            .filter(Boolean)
            .some((secret) => val.includes(secret))
        )
          u.searchParams.delete(key);
      value = u.href;
    } catch {}
  }
  for (const secret of [auth.applicationId, auth.accessKey].filter(Boolean))
    value = value.split(secret).join("[redacted]");
  return value;
}
async function searchRakuten(query = {}) {
  const auth = credentials();
  if (!auth.applicationId || !auth.accessKey) {
    const e = new Error("楽天APIのサーバー設定が不足しています");
    e.status = 503;
    throw e;
  }
  const params = new URLSearchParams({
    applicationId: auth.applicationId,
    accessKey: auth.accessKey,
    format: "json",
    imageFlag: 1,
  });
  if (auth.affiliateId) params.set("affiliateId", auth.affiliateId);
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const response = await fetch(
    ENDPOINT + "?" + params.toString().replace(/%3A/g, ":"),
    {
      headers: {
        Origin: "https://rakuten-gift-tool.vercel.app",
        Referer: "https://rakuten-gift-tool.vercel.app/",
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  let data;
  try {
    data = await response.json();
  } catch {
    const e = new Error("楽天APIからJSONを取得できませんでした");
    e.status = 502;
    throw e;
  }
  if (!response.ok || data.error) {
    const e = new Error(
      response.status === 429
        ? "楽天APIの利用制限です。時間をおいて再実行してください。"
        : "楽天APIの検索に失敗しました",
    );
    e.status = response.status === 429 ? 429 : 502;
    e.upstreamStatus = response.status;
    throw e;
  }
  return scrub(data, auth);
}
function productPage(raw) {
  for (let n = 0; n < 4; n++) {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && u.hostname === "item.rakuten.co.jp")
        return u.href;
      if (u.hostname !== "hb.afl.rakuten.co.jp") return "";
      raw = u.searchParams.get("pc");
    } catch {
      return "";
    }
  }
  return "";
}
function imageUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" &&
      u.hostname === "thumbnail.image.rakuten.co.jp" &&
      u.pathname.startsWith("/@0_mall/") &&
      !u.username &&
      !u.password &&
      !u.port
      ? u.href
      : "";
  } catch {
    return "";
  }
}
function publicItem(item) {
  return {
    itemCode: item.itemCode,
    itemName: item.itemName,
    shopCode: item.shopCode,
    shopName: item.shopName,
    price: Number(item.itemPrice) || 0,
    availability: item.availability,
    reviewAverage: Number(item.reviewAverage) || 0,
    reviewCount: Number(item.reviewCount) || 0,
    productUrl: productPage(item.itemUrl),
    affiliateUrl: scrub(item.affiliateUrl || item.itemUrl),
    images: [
      ...new Set(
        (item.mediumImageUrls?.length
          ? item.mediumImageUrls
          : item.smallImageUrls || []
        )
          .map((i) => imageUrl(i.imageUrl || i))
          .filter(Boolean),
      ),
    ],
  };
}
module.exports = { searchRakuten, publicItem, productPage, imageUrl, scrub };
