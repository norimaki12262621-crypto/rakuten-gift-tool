const { searchRakuten, publicItem } = require("../lib/rakuten.cjs");
module.exports = async function handler(req, res) {
  const product = String(req.query.product || "").trim(),
    brand = String(req.query.brand || "").trim(),
    color = String(req.query.color || "").trim();
  const page = Number(req.query.page || 1);
  if (
    !product ||
    product.length > 150 ||
    brand.length > 80 ||
    color.length > 60 ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10
  )
    return res
      .status(400)
      .json({
        error: "商品名と検索条件を確認してください（各検索10ページまで）",
      });
  const mode = ["broad", "color"].includes(req.query.mode)
    ? req.query.mode
    : "exact";
  const category =
    (product.match(
      /グロス|パウダー|ファンデーション|美容液|化粧水|リップ|口紅|アイシャドウ/i,
    ) || [])[0] || "";
  const keyword = (
    mode === "color" && brand && color
      ? [brand, category, color]
      : [brand, product, mode === "exact" ? color : ""]
  )
    .filter(Boolean)
    .join(" ");
  try {
    const d = await searchRakuten({
      keyword,
      hits: 30,
      page,
      availability: req.query.includeUnavailable === "0" ? 1 : 0,
    });
    res
      .status(200)
      .json({
        keyword,
        page,
        total: d.count || 0,
        pageCount: Math.min(10, Math.ceil((d.count || 0) / 30)),
        items: (d.Items || []).map((i) => publicItem(i.Item || i)),
        fetchedAt: new Date().toISOString(),
      });
  } catch (e) {
    res
      .status(e.status || 502)
      .json({ error: e.message, upstreamStatus: e.upstreamStatus });
  }
};
