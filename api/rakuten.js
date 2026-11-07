const { searchRakuten } = require("../lib/rakuten.cjs");
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  const { keyword, itemCode, shopCode, minPrice, maxPrice, sort, hits, page } =
    req.query;
  let params;
  if (itemCode) params = { itemCode };
  else if (shopCode)
    params = { shopCode, hits: hits || 30, page, keyword, sort };
  else
    params = {
      keyword: keyword || "母の日 プレゼント",
      hits: hits || 30,
      sort: sort || "-reviewCount",
      minPrice: minPrice || 3000,
      maxPrice: maxPrice || 7000,
      page,
    };
  try {
    res.status(200).json(await searchRakuten(params));
  } catch (e) {
    res
      .status(e.status || 502)
      .json({ error: e.message, upstreamStatus: e.upstreamStatus });
  }
};
