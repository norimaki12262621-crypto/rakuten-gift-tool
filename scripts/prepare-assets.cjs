const fs = require("node:fs"),
  path = require("node:path");
const base = path.join(__dirname, "..");
const out = path.join(base, "assets/vendor");
fs.mkdirSync(out, { recursive: true });
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
for (const file of [
  "tesseract.min.js",
  "worker.min.js",
  "tesseract.min.js.LICENSE.txt",
  "worker.min.js.LICENSE.txt",
])
  copy(
    path.join(base, "node_modules/tesseract.js/dist", file),
    path.join(out, file),
  );
const core = path.join(base, "node_modules/tesseract.js-core");
for (const f of fs.readdirSync(core))
  if (f.startsWith("tesseract-core") || f === "LICENSE")
    copy(path.join(core, f), path.join(out, "core", f));
for (const language of ["eng", "jpn"])
  copy(
    path.join(
      base,
      `node_modules/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`,
    ),
    path.join(out, `lang/${language}.traineddata.gz`),
  );
copy(
  path.join(base, "node_modules/jszip/dist/jszip.min.js"),
  path.join(out, "jszip.min.js"),
);
copy(
  path.join(base, "node_modules/jszip/LICENSE.markdown"),
  path.join(out, "JSZip-LICENSE.md"),
);
console.log("Local OCR worker, WASM, model and ZIP assets prepared");
