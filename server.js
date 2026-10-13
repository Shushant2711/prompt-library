// ENTRY POINT: starts the server and sends each request to the right file
const http = require("http");
const { send } = require("./src/utils/http");
const serveStatic = require("./src/utils/staticFiles");
const run = require("./src/routes/run");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method === "POST" && req.url === "/api/run") return run(req, res);
  if (req.method === "GET" && serveStatic(req, res)) return;
  send(res, 404, { error: "Not found" });
}).listen(PORT, () => console.log("Prompt Library running on http://localhost:" + PORT));
