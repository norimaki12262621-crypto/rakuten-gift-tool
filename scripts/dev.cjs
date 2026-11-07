// Dependency-free local server for the static page and Vercel-style API handlers.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
try {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const handlers = {
  "/api/sns-search": require("../api/sns-search.js"),
  "/api/rakuten": require("../api/rakuten.js"),
  "/api/rakuten-image": require("../api/rakuten-image.js"),
};
const port = Number(process.env.PORT || 3000);
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (handlers[url.pathname]) {
      req.query = Object.fromEntries(url.searchParams);
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };
      res.send = (data) => res.end(data);
      try {
        await handlers[url.pathname](req, res);
      } catch {
        if (!res.writableEnded)
          res.status(500).json({ error: "ローカルAPIでエラーが発生しました" });
      }
      return;
    }
    const root = path.resolve(__dirname, "..", process.env.SERVE_BUILD === "1" ? "public" : ".");
    const name = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = path.resolve(root, "." + name);
    const permitted =
      ["/index.html", "/collector.html"].includes(name) ||
      name.startsWith("/assets/");
    if (
      !permitted ||
      !file.startsWith(root + path.sep) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".wasm": "application/wasm",
      ".gz": "application/gzip",
      ".txt": "text/plain; charset=utf-8",
    };
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Local development server ready on port ${port}`),
  );
