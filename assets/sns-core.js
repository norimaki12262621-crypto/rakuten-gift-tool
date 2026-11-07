(function (root, factory) {
  const value = factory();
  if (typeof module === "object" && module.exports) module.exports = value;
  else root.SNSCore = value;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const normalize = (s) =>
    String(s || "")
      .normalize("NFKC")
      .toUpperCase();
  function codes(s) {
    return [
      ...new Set(
        (
          normalize(s).match(
            /\b[A-Z]{1,3}\d{1,3}\b|(?<![\p{L}\p{N}])\d{2,3}(?![\p{L}\p{N}]|\s*%)/gu,
          ) || []
        ).filter((c) => !["30", "70", "100"].includes(c)),
      ),
    ];
  }
  function percentages(s) {
    return [
      ...new Set([...normalize(s).matchAll(/\b(30|70)\s*%/g)].map((m) => m[1])),
    ];
  }
  function targets(input) {
    return String(input || "")
      .split(/\n|,|、/)
      .map((v) => v.normalize("NFKC").trim())
      .filter(Boolean)
      .map((line, n) => {
        const code = codes(line)[0] || "";
        const percent = percentages(line)[0] || "";
        const name = line
          .replace(new RegExp(code || "$^", "i"), "")
          .replace(/(?:30|70)\s*[%％]/, "")
          .replace(/^[#＃:：\s・-]+/, "")
          .trim();
        return { id: "target-" + n, code, name, percent, label: line };
      });
  }
  function match(target, item, ocr, { product = "", brand = "" } = {}) {
    const title = normalize(item.itemName),
      text = normalize(ocr?.text);
    const family = (c) =>
      /[A-Z]/.test(target.code)
        ? /^[A-Z]{1,3}\d{2,3}$/.test(c)
        : /^\d{2,3}$/.test(c);
    const tc = codes(title).filter(family),
      ic = codes(text).filter(family),
      tp = percentages(title),
      ip = percentages(text);
    const reliable = Number(ocr?.confidence) >= 60;
    const reason = [];
    const identity = [product, brand]
      .filter(Boolean)
      .every((word) =>
        title.replace(/\s/g, "").includes(normalize(word).replace(/\s/g, "")),
      );
    if (
      target.code &&
      ((tc.length && !tc.includes(target.code)) ||
        (reliable && ic.length && !ic.includes(target.code)))
    )
      return {
        state: "mismatch",
        reason: "商品名または画像内の色番号が別色です",
      };
    if (
      target.percent &&
      ((tp.length && !tp.includes(target.percent)) ||
        (reliable && ip.length && !ip.includes(target.percent)))
    )
      return {
        state: "mismatch",
        reason: "商品名または画像内の濃度が対象と異なります",
      };
    if (!identity) reason.push("商品名・ブランドの一致を要確認");
    if (!target.code)
      return {
        state: "review",
        reason: "色番号なし。商品本体と商品情報を手動確認してください",
      };
    if (!ic.includes(target.code))
      reason.push("画像内の色番号をOCRで確認できません");
    if (ic.length > 1) reason.push("画像に複数色の表記があります");
    if (target.percent && !ip.includes(target.percent))
      reason.push("画像内の濃度を確認できません");
    if (
      target.name &&
      !title.includes(normalize(target.name)) &&
      !text.includes(normalize(target.name))
    )
      reason.push("色名の一致を確認できません");
    if (!ocr || Number(ocr.confidence) < 60)
      reason.push("OCRの信頼度が不足しています");
    return reason.length
      ? { state: "review", reason: reason.join("／") }
      : {
          state: "confirmed",
          reason: "商品名・画像内色番号・指定濃度をOCR照合（自動候補）",
        };
  }
  function quality(pixels, width, height, ocr = {}) {
    const size = Math.min(width, height);
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0,
      count = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4,
          r = pixels[p],
          g = pixels[p + 1],
          b = pixels[p + 2];
        if (
          pixels[p + 3] > 100 &&
          (Math.max(r, g, b) - Math.min(r, g, b) > 28 || (r + g + b) / 3 < 220)
        ) {
          count++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    const area = width * height,
      bbox = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1)),
      occupancy = count / area,
      fill = count / bbox;
    const words = String(ocr.text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const banner = words > 45 || fill > 0.9;
    const box = fill > 0.8 && occupancy > 0.1;
    let score = Math.round(
      Math.min(45, occupancy * 125) +
        25 +
        (ocr.text ? 5 : 0) -
        (banner ? 35 : box ? 20 : 0) -
        (words > 25 ? 15 : 0),
    );
    const native = ocr.nativeSize || size;
    if (native < 300) score -= 20;
    return {
      score: Math.max(0, Math.min(100, score)),
      type: banner
        ? "banner-like"
        : box
          ? "box-like"
          : occupancy > 0.12 && occupancy < 0.8
            ? "body-like"
            : "unknown",
      reasons: [
        `${Math.round(occupancy * 100)}%の有色領域（本体の大きさの推定）`,
        banner
          ? "文字が多い／背景が全面的な画像"
          : box
            ? "箱・矩形バナーの可能性"
            : "箱・バナーを断定しない補助評価",
        native < 300 ? "解像度が低い" : "解像度を記録済み",
      ],
      occupancy,
      fill,
    };
  }
  function canExport(targets, selected) {
    return (
      targets.length > 0 &&
      targets.every((t) => {
        const c = selected[t.id];
        return c && c.state === "confirmed" && c.blob && c.item.productUrl;
      })
    );
  }
  function filename(t, mime) {
    const stem = (t.code || t.id).replace(/[^a-z0-9_-]/gi, "_");
    return `images/${stem}${t.percent ? "-" + t.percent : ""}-${t.id}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
  }
  function manifest(targets, selected, options) {
    if (!canExport(targets, selected)) throw Error("未確定の画像があります");
    return {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      product: options.product,
      brand: options.brand,
      format: options.format,
      aspectRatio: options.format === "instagram" ? "4:5" : "9:16",
      renderProductWithAI: false,
      rights: {
        status: "user-reviewed",
        note: "API取得はSNS転載の許諾を意味しません。取得元・権利者の利用条件を確認してください。",
        publicShareCreated: false,
      },
      items: targets.map((t) => {
        const c = selected[t.id];
        return {
          colorCode: t.code,
          colorName: t.name,
          concentration: t.percent ? `${t.percent}%` : null,
          filename: filename(t, c.mime),
          productName: c.item.itemName,
          itemCode: c.item.itemCode,
          shopName: c.item.shopName,
          productUrl: c.item.productUrl,
          affiliateUrl: c.item.affiliateUrl,
          apiListedPrice: c.item.price,
          priceScope:
            (t.code &&
              codes(c.item.itemName).filter((code) =>
                /[A-Z]/.test(t.code)
                  ? /^[A-Z]+\d+$/.test(code)
                  : /^\d+$/.test(code),
              ).length !== 1) ||
            /選べる|全\d|[A-Z]\d{2}.*[A-Z]\d{2}/i.test(c.item.itemName)
              ? "shared-page-reference"
              : "api-listed-reference",
          availability: c.item.availability,
          reviewAverage: c.item.reviewAverage,
          reviewCount: c.item.reviewCount,
          imageUrl: c.imageUrl,
          downloadedUrl: c.downloadedUrl,
          width: c.width,
          height: c.height,
          sha256: c.sha256,
          httpStatus: c.httpStatus,
          matchStatus: c.state,
          matchReason: c.reason,
          confirmedBy: c.confirmedBy || "ocr",
          ocrText: c.ocr?.text || "",
          manualTranscription: c.manualTranscription || null,
          ocrConfidence: c.ocr?.confidence || 0,
          quality: c.quality,
          photoTreatment: "original bytes, no redraw or logo removal",
        };
      }),
    };
  }
  return {
    normalize,
    codes,
    percentages,
    targets,
    match,
    quality,
    canExport,
    manifest,
    filename,
  };
});
