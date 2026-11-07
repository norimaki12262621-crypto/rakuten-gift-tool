// Deterministic UI regression with a technical 1px PNG fixture and fixed OCR output.
// Real API/image/OCR integration is a separate smoke test, documented in docs.
const { chromium } = require("playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path"),
  { spawn } = require("node:child_process"),
  crypto = require("node:crypto"),
  JSZip = require("jszip");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1kAAAAASUVORK5CYII=",
  "base64",
);
const root = path.resolve(__dirname, ".."),
  port = Number(process.env.TEST_PORT || 3021),
  origin = `http://127.0.0.1:${port}`;
const item = (code, name) => ({
  itemCode: `sample:${code}`,
  itemName: `SampleBrand Sample Product ${code} ${name} 70%`,
  shopCode: "sample",
  shopName: "Sample",
  price: 1234,
  availability: 1,
  reviewAverage: 4.5,
  reviewCount: 12,
  productUrl: `https://item.rakuten.co.jp/sample/${code}/`,
  affiliateUrl: `https://hb.afl.rakuten.co.jp/hgc/sample/?pc=${encodeURIComponent("https://item.rakuten.co.jp/sample/" + code + "/")}`,
  images: [
    `https://thumbnail.image.rakuten.co.jp/@0_mall/sample/${code}.png?_ex=128x128`,
  ],
});
(async () => {
  const server = spawn(process.execPath, ["scripts/dev.cjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  let browser;
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "sns-browser-"));
  try {
    let ready = false;
    for (let n = 0; n < 50; n++) {
      try {
        if ((await fetch(origin + "/collector.html")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(ready, "local server did not start");
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/assets/vendor/tesseract.min.js", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: 'window.Tesseract={createWorker:async()=>({recognize:async()=>({data:{text:"",confidence:0}}),terminate:async()=>{}})};',
      }),
    );
    let apiFailure = false;
    const items = [
      item("T01", "Red"),
      item("T02", "Pink"),
      {
        ...item("T01", "Red"),
        itemCode: "sample:failed",
        images: [
          "https://thumbnail.image.rakuten.co.jp/@0_mall/sample/failed.png",
        ],
      },
    ];
    await page.route("**/api/sns-search?**", (r) =>
      r.fulfill(
        apiFailure
          ? { status: 503, json: { error: "fixture search failure" } }
          : { json: { items, total: 3, pageCount: 2 } },
      ),
    );
    await page.route("**/api/rakuten-image?**", (r) =>
      r.fulfill(
        r.request().url().includes("failed.png")
          ? {
              status: 502,
              json: { error: "fixture failure", upstreamStatus: 403 },
            }
          : { status: 200, contentType: "image/png", body: png },
      ),
    );
    await page.goto(origin + "/collector.html");
    await page.locator("#product").fill("Sample Product");
    await page.locator("#brand").fill("SampleBrand");
    await page.locator("#colors").fill("T01 Red 70%\nT02 Pink 70%");
    await page.locator("#search").click();
    await page.waitForFunction(
      () => !state.busy && state.rows.length > 0,
      {},
      { timeout: 30000 },
    );
    assert((await page.locator(".badge.review").count()) > 0);
    assert((await page.locator(".badge.mismatch").count()) > 0);
    assert((await page.locator(".badge.failed").count()) > 0);
    assert(await page.locator("#export").isDisabled());
    for (const [n, code, name] of [
      [0, "T01", "Red"],
      [1, "T02", "Pink"],
    ]) {
      const card = page.locator(
        `article[data-candidate^="target-${n}|sample:${code}|"]`,
      );
      await card.getByRole("button", { name: "手動で照合・採用" }).click();
      await page.locator("#manual-transcription").fill(`${code} ${name} 70%`);
      await page.locator("#confirm-check").check();
      await page.locator("#confirm-submit").click();
    }
    await page.locator("#more").click();
    await page.waitForFunction(() => !state.busy, {}, { timeout: 30000 });
    assert.equal(await page.locator("article.candidate").count(), 6);
    assert(await page.locator("#export").isDisabled());
    await page.locator("#rights").check();
    assert(await page.locator("#export").isEnabled());
    for (const format of ["instagram", "tiktok"]) {
      await page.locator("#format").selectOption(format);
      await page.locator("#rights").check();
      const download = page.waitForEvent("download");
      await page.locator("#export").click();
      const file = path.join(temp, format + ".zip");
      await (await download).saveAs(file);
      const zip = await JSZip.loadAsync(await fs.readFile(file));
      const manifest = JSON.parse(
        await zip.file("manifest.json").async("string"),
      );
      assert.equal(
        manifest.aspectRatio,
        format === "instagram" ? "4:5" : "9:16",
      );
      assert.equal(manifest.items.length, 2);
      assert(zip.file("collection-report.json"));
      const report = JSON.parse(
        await zip.file("collection-report.json").async("string"),
      );
      assert(
        report.candidates.some(
          (c) => c.state === "failed" && c.upstreamStatus === 403,
        ),
      );
      assert.equal(new Set(manifest.items.map((i) => i.filename)).size, 2);
      for (const entry of manifest.items) {
        const bytes = await zip.file(entry.filename).async("nodebuffer");
        assert.deepEqual(bytes, png);
        assert.equal(
          entry.sha256,
          crypto.createHash("sha256").update(png).digest("hex"),
        );
        assert.equal(entry.confirmedBy, "human");
        assert(entry.manualTranscription.includes(entry.colorCode));
      }
      assert(!JSON.stringify(manifest).includes("accessKey"));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .getByRole("button", { name: "採用を解除", exact: true })
      .first()
      .click();
    assert(await page.locator("#export").isDisabled());
    await page.locator("#search").click();
    await page.locator("#cancel").click();
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => state.busy), false);
    assert.match(await page.locator("#progress").innerText(), /中止/);
    apiFailure = true;
    await page.locator("#search").click();
    await page.waitForFunction(() => !state.busy, {}, { timeout: 30000 });
    assert.match(
      await page.locator("#search-errors").innerText(),
      /fixture search failure/,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser: three states, manual selection, pagination/dedup, error handling, cancel, original-byte ZIP and manifest, 4:5/9:16, mobile, export guards",
    );
  } finally {
    await browser?.close();
    server.kill();
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
