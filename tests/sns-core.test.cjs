const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../assets/sns-core.js");
const t = C.targets("B03 キャンディー 70%")[0],
  context = { brand: "fwee", product: "3Dボリューミンググロス" },
  item = {
    itemName: "fwee 3Dボリューミンググロス B03 キャンディー 70%",
    productUrl: "https://item.rakuten.co.jp/shop/item/",
  };
test("target parsing preserves codes and concentration; 101 is distinct from 01", () => {
  assert.equal(t.code, "B03");
  assert.equal(t.name, "キャンディー");
  assert.equal(t.percent, "70");
  assert.deepEqual(C.codes("101 01 70% 20g"), ["101", "01"]);
  assert.equal(C.targets("Ｂ０２ ソルベ ７０％")[0].code, "B02");
  assert.equal(C.targets("Ｂ０２ ソルベ ７０％")[0].name, "ソルベ");
});
test("OCR and matching product metadata can confirm an exact color", () => {
  assert.equal(
    C.match(t, item, { text: "B03 70%", confidence: 90 }, context).state,
    "confirmed",
  );
});
test("different image color, different product color and concentration are mismatches", () => {
  for (const [i, ocr] of [
    [item, "B07 70%"],
    [
      { ...item, itemName: "fwee 3Dボリューミンググロス B02 ソルベ 70%" },
      "B03 70%",
    ],
    [item, "B03 30%"],
  ])
    assert.equal(
      C.match(t, i, { text: ocr, confidence: 99 }, context).state,
      "mismatch",
    );
});
test("unreadable, multi-color and unreliable OCR never auto-confirm", () => {
  for (const ocr of [
    { text: "", confidence: 0 },
    { text: "B03 B07 70%", confidence: 99 },
    { text: "B03 70%", confidence: 20 },
    { text: "B03", confidence: 99 },
  ])
    assert.equal(C.match(t, item, ocr, context).state, "review");
});
test("wrong brand or color name remains review", () => {
  assert.equal(
    C.match(
      { ...t, name: "ソルベ" },
      item,
      { text: "B03 70%", confidence: 99 },
      context,
    ).state,
    "review",
  );
  assert.equal(
    C.match(
      t,
      item,
      { text: "B03 70%", confidence: 99 },
      { ...context, brand: "other" },
    ).state,
    "review",
  );
});
test("manifest excludes unconfirmed selections and has collision-free filenames", () => {
  assert.throws(() => C.manifest([t], {}, context));
  assert.notEqual(
    C.filename({ ...t, id: "one" }, "image/jpeg"),
    C.filename({ ...t, id: "two" }, "image/jpeg"),
  );
  const row = {
    item: { ...item, price: 1000 },
    blob: Buffer.from("original"),
    mime: "image/jpeg",
    state: "review",
  };
  assert.equal(C.canExport([t], { [t.id]: row }), false);
  row.state = "confirmed";
  assert.equal(C.canExport([t], { [t.id]: row }), true);
  const m = C.manifest(
    [t],
    { [t.id]: row },
    { ...context, format: "instagram" },
  );
  assert.equal(m.aspectRatio, "4:5");
  assert.equal(m.items[0].colorCode, "B03");
  assert.equal(m.renderProductWithAI, false);
  assert.equal(m.rights.publicShareCreated, false);
});
test("pixel quality reports an estimate and marks low native resolution", () => {
  const pixels = new Uint8ClampedArray(160 * 160 * 4).fill(255);
  for (let y = 30; y < 140; y++)
    for (let x = 55; x < 105; x++) {
      const p = (y * 160 + x) * 4;
      pixels[p] = 200;
      pixels[p + 1] = 40;
      pixels[p + 2] = 70;
    }
  const q = C.quality(pixels, 160, 160, { nativeSize: 100, text: "" });
  assert(q.score >= 0 && q.score <= 100);
  assert(q.reasons.includes("解像度が低い"));
  assert(q.type !== "confirmed");
});

test("total color counts and low confidence OCR noise do not cause false mismatch", () => {
  assert.equal(
    C.match(
      t,
      { itemName: "fwee 3Dボリューミンググロス 全24色" },
      { text: "800 30%", confidence: 10 },
      context,
    ).state,
    "review",
  );
});

test("numeric shade parsing ignores color totals and capacities", () => {
  assert.deepEqual(C.codes("全24色 20g #00 01 101"), ["00", "01", "101"]);
});
