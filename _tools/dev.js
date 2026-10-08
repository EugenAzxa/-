// Локальный просмотр с чистыми адресами как на Vercel (/seo, /blog/slug): node _tools/dev.js -> http://localhost:8123
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), port = +process.env.PORT || 8123;
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".webp":"image/webp", ".jpg":"image/jpeg",
  ".png":"image/png", ".svg":"image/svg+xml", ".xml":"application/xml", ".txt":"text/plain; charset=utf-8", ".json":"application/json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  const tries = [p, p + ".html", path.join(p, "index.html")];
  for (const t of tries) {
    const f = path.join(root, t);
    if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
      return fs.createReadStream(f).pipe(res);
    }
  }
  res.writeHead(404); res.end("404");
}).listen(port, () => console.log("http://localhost:" + port));
