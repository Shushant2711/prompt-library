// POST /api/run : checks the request, picks the provider, returns the reply
const { send, readBody } = require("../utils/http");
const limited = require("../utils/rateLimit");
const callClaude = require("../providers/claude");
const callOpenAI = require("../providers/openai");
const callGemini = require("../providers/gemini");

const PROVIDERS = {
  gemini: { call: callGemini, env: "GEMINI_API_KEY" },
  groq: { call: (o) => callOpenAI({ ...o, baseUrl: "https://api.groq.com/openai/v1", name: "Groq" }), env: "GROQ_API_KEY" },
  anthropic: { call: callClaude, env: "ANTHROPIC_API_KEY" },
  openai: { call: callOpenAI, env: "OPENAI_API_KEY" },
};

module.exports = async function run(req, res) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (limited(ip)) return send(res, 429, { error: "Too many requests. Wait a minute and try again." });
  try {
    const { provider, model, system, prompt, apiKey } = await readBody(req);
    const p = PROVIDERS[provider];
    if (!p) return send(res, 400, { error: "Unknown provider." });
    if (!prompt || !prompt.trim()) return send(res, 400, { error: "Prompt is empty." });
    if (!model) return send(res, 400, { error: "Model name is missing." });
    const key = apiKey || process.env[p.env];
    if (!key) return send(res, 400, { error: "No API key. Add one in API keys." });
    const started = Date.now();
    const out = await p.call({ apiKey: key, model, system, prompt });
    send(res, 200, { ...out, ms: Date.now() - started });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
};
