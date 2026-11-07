const { test } = require("node:test"),
  assert = require("node:assert/strict");
const search = require("../api/sns-search.js");
const legacy = require("../api/rakuten.js");
const { scrub, publicItem } = require("../lib/rakuten.cjs");
const auth = {
  applicationId: "test-app-only-server",
  accessKey: "test-secret-only-server",
};
function res() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(s) {
      this.code = s;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
}
test("server API: validation, cross-shop search, legacy defaults and credential sanitation", async (t) => {
  const original = global.fetch,
    app = process.env.RAKUTEN_APPLICATION_ID,
    key = process.env.RAKUTEN_ACCESS_KEY;
  process.env.RAKUTEN_APPLICATION_ID = auth.applicationId;
  process.env.RAKUTEN_ACCESS_KEY = auth.accessKey;
  t.after(() => {
    global.fetch = original;
    if (app === undefined) delete process.env.RAKUTEN_APPLICATION_ID;
    else process.env.RAKUTEN_APPLICATION_ID = app;
    if (key === undefined) delete process.env.RAKUTEN_ACCESS_KEY;
    else process.env.RAKUTEN_ACCESS_KEY = key;
  });
  await t.test(
    "rejects missing product and invalid pages without a request",
    async () => {
      global.fetch = () => {
        throw Error("must not fetch");
      };
      for (const query of [
        {},
        { product: "x", page: 11 },
        { product: "x", page: "bad" },
      ]) {
        const r = res();
        await search({ query }, r);
        assert.equal(r.code, 400);
      }
    },
  );
  await t.test(
    "search has no shop restriction, includes unavailable items, strips server IDs from output",
    async () => {
      global.fetch = async (raw) => {
        const u = new URL(raw);
        assert(!u.searchParams.has("shopCode"));
        assert.equal(u.searchParams.get("availability"), "0");
        assert.equal(u.searchParams.get("applicationId"), auth.applicationId);
        assert.equal(u.searchParams.get("accessKey"), auth.accessKey);
        return Response.json({
          count: 1,
          Items: [
            {
              Item: {
                itemCode: "shop:1",
                itemName: "fwee B03",
                shopCode: "shop",
                itemUrl: `https://hb.afl.rakuten.co.jp/hgc/id/?pc=${encodeURIComponent("https://item.rakuten.co.jp/shop/1/")}&rafcid=${auth.applicationId}`,
                mediumImageUrls: [
                  {
                    imageUrl:
                      "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/1.jpg",
                  },
                ],
              },
            },
          ],
        });
      };
      const r = res();
      await search(
        { query: { product: "gloss", brand: "fwee", color: "B03" } },
        r,
      );
      assert.equal(r.code, 200);
      assert.equal(
        r.body.items[0].productUrl,
        "https://item.rakuten.co.jp/shop/1/",
      );
      assert(!JSON.stringify(r.body).includes(auth.applicationId));
      assert(!JSON.stringify(r.body).includes(auth.accessKey));
    },
  );
  await t.test(
    "legacy ranking keeps default price range; page and itemCode branches work",
    async () => {
      let params;
      global.fetch = async (u) => {
        params = new URL(u).searchParams;
        return Response.json({ Items: [] });
      };
      await legacy({ query: {} }, res());
      assert.equal(params.get("minPrice"), "3000");
      assert.equal(params.get("maxPrice"), "7000");
      await legacy({ query: { itemCode: "shop:1" } }, res());
      assert(!params.has("minPrice"));
      assert.equal(params.get("itemCode"), "shop:1");
    },
  );
  await t.test(
    "upstream 429 and unavailable credentials are explicit",
    async () => {
      global.fetch = async () =>
        Response.json({ error: "rate limit" }, { status: 429 });
      let r = res();
      await search({ query: { product: "x" } }, r);
      assert.equal(r.code, 429);
      delete process.env.RAKUTEN_ACCESS_KEY;
      r = res();
      await search({ query: { product: "x" } }, r);
      assert.equal(r.code, 503);
    },
  );
});
test("DTO accepts only Rakuten image sources and cannot expose raw API fields", () => {
  const i = publicItem({
    itemName: "x",
    itemPrice: 12,
    itemUrl: "javascript:alert(1)",
    accessKey: "hidden",
    mediumImageUrls: [
      { imageUrl: "https://evil.test/p.jpg" },
      { imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/x/a.jpg" },
    ],
  });
  assert.equal(i.productUrl, "");
  assert.equal(i.images.length, 1);
  assert(!JSON.stringify(i).includes("hidden"));
  assert(
    !JSON.stringify(scrub({ value: auth.accessKey }, auth)).includes(
      auth.accessKey,
    ),
  );
});
