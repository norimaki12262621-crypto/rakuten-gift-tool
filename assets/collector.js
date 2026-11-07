"use strict";
const Core = window.SNSCore,
  $ = (id) => document.getElementById(id);
const state = {
  run: 0,
  busy: false,
  targets: [],
  context: null,
  rows: [],
  items: new Map(),
  resources: new Map(),
  selected: {},
  errors: [],
  page: 1,
  hasMore: false,
  workerPromise: null,
  ocrUnavailable: false,
};
let renderTimer;
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function link(text, url) {
  const a = el("a", text);
  if (/^https:\/\//.test(url || "")) {
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
function refreshSoon() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 70);
}
function setError(message) {
  if (!state.errors.includes(message)) state.errors.push(message);
  $("search-errors").replaceChildren(
    ...state.errors.map((s) => el("p", s, "error")),
  );
}
function release() {
  for (const r of state.resources.values())
    if (r.objectUrl) URL.revokeObjectURL(r.objectUrl);
  state.resources.clear();
}
function options() {
  return { ...state.context, format: $("format").value };
}
function sourceMetadata(host, row) {
  host.append(el("p", row.item.itemName, "name"));
  host.append(
    el(
      "p",
      `¥${row.item.price.toLocaleString("ja-JP")}（API掲載参考価格）／★${row.item.reviewAverage}・${row.item.reviewCount}件${row.item.availability === 0 ? "／在庫切れ" : ""}`,
      "small",
    ),
  );
  host.append(link("商品ページ", row.item.productUrl));
  if (!row.item.productUrl)
    host.append(el("p", "商品ページURLなし・採用不可", "small"));
}
function setSelected(target, row) {
  state.selected[target.id] = row;
  $("rights").checked = false;
  render();
}
function updateRows(resource) {
  for (const row of state.rows.filter(
    (v) => v.imageUrl === resource.imageUrl,
  )) {
    Object.assign(row, resource);
    if (resource.error) {
      row.state = "failed";
      row.reason = resource.error;
      if (state.selected[row.target.id] === row)
        delete state.selected[row.target.id];
      continue;
    }
    if (!row.manual) {
      const m = Core.match(row.target, row.item, resource.ocr, state.context);
      row.state = m.state;
      row.reason = m.reason;
      row.confirmedBy = "ocr";
    }
  }
}
function autoChoose() {
  for (const t of state.targets) {
    if (state.selected[t.id]?.manual) continue;
    const rows = state.rows
      .filter(
        (r) =>
          r.target.id === t.id &&
          r.state === "confirmed" &&
          r.quality?.type === "body-like" &&
          r.quality.score >= 50 &&
          r.blob &&
          r.item.productUrl,
      )
      .sort((a, b) => b.quality.score - a.quality.score);
    if (
      rows.length &&
      (!state.selected[t.id] ||
        rows[0].quality.score > state.selected[t.id].quality.score)
    ) {
      state.selected[t.id] = rows[0];
      $("rights").checked = false;
    }
  }
}
async function ensureWorker() {
  if (state.ocrUnavailable) return null;
  if (!state.workerPromise) {
    state.workerPromise = Tesseract.createWorker("eng+jpn", 1, {
      workerPath: "/assets/vendor/worker.min.js",
      corePath: "/assets/vendor/core",
      langPath: "/assets/vendor/lang",
      gzip: true,
    }).catch(() => {
      state.ocrUnavailable = true;
      setError(
        "OCRを起動できません。画像収集は続けますが色は要確認です。元画像を見て手動確認してください。",
      );
      return null;
    });
  }
  return state.workerPromise;
}
async function inspectImage(imageUrl, run) {
  const cached = state.resources.get(imageUrl);
  if (cached && !cached.error) return cached;
  const result = { imageUrl, httpStatus: null };
  try {
    const url = new URL(imageUrl);
    if (
      url.hostname !== "thumbnail.image.rakuten.co.jp" ||
      !url.pathname.startsWith("/@0_mall/")
    )
      throw Error("楽天APIの商品画像URLではありません");
    if (state.context.large && url.searchParams.has("_ex"))
      url.searchParams.set("_ex", "1000x1000");
    result.downloadedUrl = url.href;
    const response = await fetch(
      "/api/rakuten-image?url=" + encodeURIComponent(url.href),
      { signal: state.controller.signal },
    );
    result.httpStatus = response.status;
    if (!response.ok) {
      let d;
      try {
        d = await response.json();
      } catch {}
      result.upstreamStatus = d?.upstreamStatus;
      throw Error(
        `画像取得失敗：HTTP ${response.status}${d?.upstreamStatus ? "（配信元 " + d.upstreamStatus + "）" : ""}`,
      );
    }
    result.blob = await response.blob();
    result.mime = result.blob.type.split(";")[0];
    result.sha256 = [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", await result.blob.arrayBuffer()),
      ),
    ]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    result.objectUrl = URL.createObjectURL(result.blob);
    const image = new Image();
    image.src = result.objectUrl;
    await image.decode();
    result.width = image.naturalWidth;
    result.height = image.naturalHeight;
    if (run !== state.run) {
      URL.revokeObjectURL(result.objectUrl);
      return null;
    }
    const worker = await ensureWorker();
    result.ocr = { text: "", confidence: 0 };
    if (worker) {
      try {
        let timer;
        const recognized = await Promise.race([
          worker.recognize(result.blob),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("OCR timeout")), 35000);
          }),
        ]).finally(() => clearTimeout(timer));
        result.ocr = {
          text: recognized.data.text.slice(0, 8000),
          confidence: recognized.data.confidence,
        };
      } catch {
        if (run !== state.run) return null;
        state.ocrUnavailable = true;
        result.ocr.error = "OCR failed or timed out";
        worker.terminate().catch(() => {});
        setError(
          "OCRが失敗またはタイムアウトしました。以降は画像収集を続け、色は要確認に残します。手動確認が可能です。",
        );
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 160, 160);
    ctx.drawImage(image, 0, 0, 160, 160);
    result.quality = Core.quality(
      ctx.getImageData(0, 0, 160, 160).data,
      160,
      160,
      { ...result.ocr, nativeSize: Math.min(result.width, result.height) },
    );
  } catch (e) {
    if (run !== state.run || e.name === "AbortError") return null;
    result.error = e.message || "画像を処理できませんでした";
    result.blob = null;
  }
  if (run !== state.run) {
    if (result.objectUrl) URL.revokeObjectURL(result.objectUrl);
    return null;
  }
  state.resources.set(imageUrl, result);
  return result;
}
function addItems(items, targetIds) {
  for (const item of items) {
    state.items.set(item.itemCode, item);
    for (const target of state.targets.filter((t) => targetIds.includes(t.id)))
      for (const imageUrl of item.images) {
        if (
          !state.rows.some(
            (r) =>
              r.item.itemCode === item.itemCode &&
              r.target.id === target.id &&
              r.imageUrl === imageUrl,
          )
        )
          state.rows.push({
            id: `${target.id}|${item.itemCode}|${imageUrl}`,
            target,
            item,
            imageUrl,
            state: "pending",
            reason: "取得・OCR待ち",
          });
      }
  }
}
async function collect(next = false) {
  if (state.busy) return;
  if (!next) {
    const product = $("product").value.trim(),
      brand = $("brand").value.trim();
    let targets = Core.targets($("colors").value);
    if (!product) return;
    if (targets.length > 6) {
      setError("一度に指定できる色は6色です。");
      return;
    }
    if (!targets.length)
      targets = [
        { id: "target-0", code: "", name: "", percent: "", label: "商品画像" },
      ];
    release();
    state.rows = [];
    state.items.clear();
    state.selected = {};
    state.targets = targets;
    state.errors = [];
    $("search-errors").replaceChildren();
    state.page = 1;
    state.context = {
      product,
      brand,
      large: $("large").checked,
      includeUnavailable: $("include-unavailable").checked,
      limit: Number($("limit").value),
    };
    $("rights").checked = false;
  } else state.page++;
  const run = ++state.run;
  state.busy = true;
  state.controller = new AbortController();
  state.hasMore = false;
  $("search").disabled = true;
  $("cancel").disabled = false;
  $("more").disabled = true;
  render();
  try {
    const queries = state.targets.map((t) => ({
      color: t.code || t.name,
      targetIds: [t.id],
      mode: "exact",
    }));
    if (state.context.brand)
      for (const t of state.targets)
        if (t.code)
          queries.push({ color: t.code, targetIds: [t.id], mode: "color" });
    if (queries.some((q) => q.color))
      queries.push({
        color: "",
        targetIds: state.targets.map((t) => t.id),
        mode: "broad",
      });
    for (const query of queries) {
      if (run !== state.run) return;
      $("progress").textContent =
        `楽天API検索：${query.color || "共通商品・複数ショップ"}／${state.page}ページ目`;
      try {
        const params = new URLSearchParams({
          product: state.context.product,
          brand: state.context.brand,
          color: query.color,
          mode: query.mode,
          page: state.page,
          includeUnavailable: state.context.includeUnavailable ? "1" : "0",
        });
        const response = await fetch("/api/sns-search?" + params, {
          signal: state.controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error || `検索失敗 HTTP ${response.status}`);
        if (run !== state.run) return;
        state.hasMore = state.hasMore || state.page < data.pageCount;
        const items = data.items
          .sort((a, b) => {
            const t = state.targets.find((t) => query.targetIds.includes(t.id));
            const rank = (i) => {
              const codes = Core.codes(i.itemName);
              return t?.code && codes.length === 1 && codes.includes(t.code)
                ? 2
                : codes.length === 0
                  ? 1
                  : 0;
            };
            return rank(b) - rank(a);
          })
          .slice(0, state.context.limit);
        addItems(items, query.targetIds);
        refreshSoon();
      } catch (e) {
        if (run !== state.run) return;
        setError(`${query.color || "共通検索"}：${e.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    const urls = [...new Set(state.rows.map((r) => r.imageUrl))];
    const todo = urls.filter((url) => !state.resources.has(url)).slice(0, 120);
    if (urls.filter((u) => !state.resources.has(u)).length > 120)
      setError(
        "一度に処理できる画像は120枚までです。商品数や色を絞って再検索してください。",
      );
    for (let n = 0; n < todo.length; n++) {
      if (run !== state.run) return;
      $("progress").textContent =
        `元画像取得・OCR照合：${n + 1}/${todo.length}枚（画像ごとに数秒かかります）。検索結果 ${state.items.size}商品・${new Set([...state.items.values()].map((i) => i.shopCode)).size}ショップ。`;
      const resource = await inspectImage(todo[n], run);
      if (run !== state.run) return;
      if (resource) updateRows(resource);
      autoChoose();
      refreshSoon();
    }
    // Shared cached images are checked independently against each target and product record.
    for (const r of state.resources.values()) updateRows(r);
    for (const row of state.rows) if (row.state === "pending") { row.state = "review"; row.reason = "今回の処理上限で未取得。条件を絞って再検索してください。"; }
    autoChoose();
    $("progress").textContent =
      `収集完了：${state.items.size}商品・${state.resources.size}画像。色は下の状態で確認してください。自動候補は補助推定です。採用前に本体と色を確認してください。${state.rows.length ? "" : " 該当候補がありません。色番号を外す、表記を変える、在庫切れを含める方法で再検索できます。"}`;
  } catch (e) {
    setError(e.message || "収集に失敗しました");
  } finally {
    if (run === state.run) {
      state.busy = false;
      $("search").disabled = false;
      $("cancel").disabled = true;
      $("more").disabled = !state.hasMore;
      render();
    }
  }
}
function render() {
  $("selection").replaceChildren();
  for (const t of state.targets) {
    const box = el("div", undefined, "chosen");
    box.append(el("h3", t.label));
    const row = state.selected[t.id];
    if (row) {
      const image = new Image();
      image.src = row.objectUrl;
      image.alt = row.item.itemName;
      box.append(
        image,
        el(
          "p",
          row.confirmedBy === "human"
            ? "採用：手動確認済み"
            : "自動候補：本体・色を最終確認してください",
          "small",
        ),
        el("p", row.item.itemName, "small"),
      );
      const clear = el("button", "採用を解除", "secondary");
      clear.onclick = () => {
        delete state.selected[t.id];
        $("rights").checked = false;
        render();
      };
      box.append(clear);
    } else
      box.append(
        el("p", "採用画像なし。未確定の色はZIP出力できません。", "small"),
      );
    $("selection").append(box);
  }
  $("export").disabled =
    state.busy ||
    !$("rights").checked ||
    !Core.canExport(state.targets, state.selected);
  const count = { confirmed: 0, review: 0, mismatch: 0, failed: 0, pending: 0 };
  for (const r of state.rows) count[r.state] = (count[r.state] || 0) + 1;
  $("counts").textContent =
    `確定 ${count.confirmed}／要確認 ${count.review}／不一致 ${count.mismatch}／取得失敗 ${count.failed}／待ち ${count.pending}`;
  const host = $("candidates");
  host.replaceChildren();
  const filter = $("filter").value;
  for (const target of state.targets) {
    const section = el("div", undefined, "target-group");
    section.append(el("h3", target.label));
    const grid = el("div", undefined, "grid");
    const rows = state.rows
      .filter(
        (r) =>
          r.target.id === target.id && (filter === "all" || r.state === filter),
      )
      .sort((a, b) => (b.quality?.score || 0) - (a.quality?.score || 0));
    for (const row of rows) {
      const card = el(
        "article",
        undefined,
        "candidate" + (state.selected[target.id] === row ? " selected" : ""),
      );
      card.dataset.candidate = row.id;
      card.dataset.state = row.state;
      const labels = {
        confirmed: "確定",
        review: "要確認",
        mismatch: "不一致",
        failed: "取得失敗",
        pending: "処理待ち",
      };
      card.append(el("span", labels[row.state], "badge " + row.state));
      if (row.objectUrl) {
        const image = new Image();
        image.src = row.objectUrl;
        image.alt = row.item.itemName;
        card.append(image);
      } else
        card.append(
          el(
            "p",
            row.state === "failed"
              ? "画像を取得できませんでした"
              : "画像を読み込んでいます",
            "small",
          ),
        );
      sourceMetadata(card, row);
      card.append(el("p", row.reason, "small"));
      if (row.quality)
        card.append(
          el(
            "p",
            `補助評価 ${row.quality.score}/100 ／ ${row.quality.type} ／ ${row.width}×${row.height}px`,
            "small",
          ),
        );
      const details = el("details");
      details.append(el("summary", "画像URL・OCR・評価根拠"));
      details.append(el("p", `API画像：${row.imageUrl}`, "small"));
      if (row.downloadedUrl)
        details.append(el("p", `取得URL：${row.downloadedUrl}`, "small"));
      details.append(
        el(
          "p",
          `HTTP ${row.httpStatus ?? "未取得"} ／ SHA-256 ${row.sha256 || "未取得"}`,
          "small",
        ),
      );
      if (row.ocr)
        details.append(
          el(
            "p",
            `OCR信頼度 ${Math.round(row.ocr.confidence)}：${row.ocr.text || "読み取りなし"}`,
            "small",
          ),
        );
      if (row.quality)
        details.append(el("p", row.quality.reasons.join("／"), "small"));
      card.append(details);
      const actions = el("div", undefined, "row");
      const choose = el(
        "button",
        row.state === "confirmed" ? "確認して採用／変更" : "手動で照合・採用",
      );
      choose.type = "button";
      choose.disabled = !row.blob || !row.item.productUrl;
      choose.onclick = () => manualConfirm(row);
      actions.append(choose);
      if (row.state === "failed") {
        const retry = el("button", "取得を再試行", "secondary");
        retry.disabled = state.busy;
        retry.onclick = async () => {
          const r = await inspectImage(row.imageUrl, state.run);
          if (r) updateRows(r);
          render();
        };
        actions.append(retry);
      }
      card.append(actions);
      grid.append(card);
    }
    if (!rows.length) grid.append(el("p", "この条件の画像候補はありません。"));
    section.append(grid);
    host.append(section);
  }
}
function manualConfirm(row) {
  const dialog = $("confirm-dialog");
  $("confirm-title").textContent = `${row.target.label} の画像を確認`;
  $("confirm-image").src = row.objectUrl;
  $("confirm-meta").replaceChildren();
  sourceMetadata($("confirm-meta"), row);
  $("confirm-meta").append(el("p", row.reason));
  const label = el(
    "label",
    "画像内で確認した表記（OCR誤読は訂正してください）",
  );
  const transcription = el("textarea");
  transcription.id = "manual-transcription";
  transcription.rows = 4;
  transcription.maxLength = 8000;
  transcription.value = row.ocr?.text || "";
  label.append(transcription);
  $("confirm-meta").append(label);
  $("confirm-warning").textContent =
    "別色・濃度違いの商品レコードは採用できません。本体と商品ページの対応も確認してください。";
  $("confirm-check").checked = false;
  $("confirm-submit").disabled = true;
  $("confirm-check").onchange = () =>
    ($("confirm-submit").disabled = !$("confirm-check").checked);
  dialog.onclose = () => {
    if (dialog.returnValue !== "confirm") return;
    const titleCheck = Core.match(
      row.target,
      row.item,
      { text: "", confidence: 0 },
      state.context,
    );
    if (titleCheck.state === "mismatch") {
      setError(
        "商品名が別色または濃度違いです。この取得元から対象色として採用できません。",
      );
      return;
    }
    const corrected = transcription.value;
    const check = Core.match(
      row.target,
      row.item,
      { text: corrected, confidence: 100 },
      state.context,
    );
    if (
      check.state === "mismatch" ||
      (row.target.code && !Core.codes(corrected).includes(row.target.code)) ||
      (row.target.percent &&
        !Core.percentages(corrected).includes(row.target.percent))
    ) {
      setError(
        "入力した画像内表記が対象の色番号・濃度と一致しません。画像を再確認してください。",
      );
      return;
    }
    row.manualTranscription = corrected;
    row.state = "confirmed";
    row.reason = "商品本体・画像内表記・商品ページを人が照合";
    row.confirmedBy = "human";
    row.manual = true;
    setSelected(row.target, row);
  };
  dialog.showModal();
}
async function exportZip() {
  if (
    state.busy ||
    !$("rights").checked ||
    !Core.canExport(state.targets, state.selected)
  )
    return;
  const button = $("export");
  button.disabled = true;
  try {
    const data = Core.manifest(state.targets, state.selected, options());
    const zip = new JSZip();
    for (const t of state.targets) {
      const r = state.selected[t.id];
      zip.file(Core.filename(t, r.mime), r.blob);
    }
    zip.file("manifest.json", JSON.stringify(data, null, 2));
    zip.file(
      "collection-report.json",
      JSON.stringify(
        {
          collectedAt: new Date().toISOString(),
          product: state.context.product,
          brand: state.context.brand,
          candidates: state.rows.map((r) => ({
            target: r.target.label,
            itemCode: r.item.itemCode,
            productName: r.item.itemName,
            productUrl: r.item.productUrl,
            imageUrl: r.imageUrl,
            downloadedUrl: r.downloadedUrl,
            httpStatus: r.httpStatus,
            upstreamStatus: r.upstreamStatus,
            width: r.width,
            height: r.height,
            sha256: r.sha256,
            state: r.state,
            reason: r.reason,
            quality: r.quality,
          })),
        },
        null,
        2,
      ),
    );
    zip.file(
      "README.txt",
      "商品写真は添付ファイルをそのまま使用してください。色番号・色名とファイルはmanifest.jsonで対応します。未確認の色に流用せず、AIで商品を描き直さないでください。投稿画像の制作はChatGPT側で行います。権利・利用条件は取得元と楽天の規約を確認してください。\n",
    );
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "STORE",
    });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = "sns-product-photos.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    $("progress").textContent =
      "採用元画像とmanifest.jsonのZIPを保存しました。外部へのアップロードや公開は行っていません。";
  } catch (e) {
    setError("ZIPを作成できませんでした：" + e.message);
  } finally {
    render();
  }
}
$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  collect();
});
$("more").onclick = () => collect(true);
$("cancel").onclick = () => {
  state.run++;
  state.controller?.abort();
  const worker = state.workerPromise;
  state.workerPromise = null;
  worker?.then((w) => w?.terminate()).catch(() => {});
  state.busy = false;
  $("search").disabled = false;
  $("cancel").disabled = true;
  $("more").disabled = true;
  $("progress").textContent =
    "収集を中止しました。処理済み候補は保持しています。";
  for (const r of state.rows)
    if (r.state === "pending") {
      r.state = "review";
      r.reason = "中止により未処理";
    }
  render();
};
$("filter").onchange = render;
$("format").onchange = () => {
  $("rights").checked = false;
  render();
};
$("rights").onchange = render;
$("export").onclick = exportZip;
window.addEventListener("beforeunload", () => {
  release();
});
render();
