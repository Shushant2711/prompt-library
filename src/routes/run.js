// POST /api/run : checks the request, picks Claude or OpenAI, returns the reply
const { send, readBody } = require("../utils/http");
const limited = require("../utils/rateLimit");
const callClaude = require("../providers/claude");
const callOpenAI = require("../providers/openai");

module.exports = async function run(req, res) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (limited(ip)) return send(res, 429, { error: "Too many requests. Wait a minute and try again." });
  try {
    const { provider, model, system, prompt, apiKey } = await readBody(req);
    if (!prompt || !prompt.trim()) return send(res, 400, { error: "Prompt is empty." });
    if (!model) return send(res, 400, { error: "Model name is missing." });
    const key = apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY);
    if (!key) return send(res, 400, { error: "No API key. Add one in Settings." });
    const started = Date.now();
    const call = provider === "openai" ? callOpenAI : callClaude;
    const out = await call({ apiKey: key, model, system, prompt });
    send(res, 200, { ...out, ms: Date.now() - started });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
};
