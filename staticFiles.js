// Serves files from the public/ folder (html, css, js)
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };

module.exports = function serveStatic(req, res) {
  const urlPath = req.url.split("?")[0];
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC) || !TYPES[path.extname(file)] || !fs.existsSync(file)) return false;
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] });
  res.end(fs.readFileSync(file));
  return true;
};
