// DATA LAYER: helpers, saved templates, localStorage
const $ = (s) => document.querySelector(s);
const LS = "pl.templates.v1", KS = "pl.keys.v1";
const DEFAULT_MODEL = { gemini: "gemini-3.8-flash", groq: "openai/gpt-oss-120b", anthropic: "claude-sonnet-5-5", openai: "gpt-4o-mini" };
const LABEL = { gemini: "Gemini", groq: "Groq", anthropic: "Claude", openai: "OpenAI" };
const DEFAULT_PROVIDER = "gemini"; // free to use
const SEED = [
  { title: "Explain like I'm new", tag: "learning", system: "You are a patient teacher. Use plain words and one everyday analogy.", body: "Explain {{topic}} to someone who has never studied it. Keep it under {{words}} words." },
  { title: "Code reviewer", tag: "coding", system: "You are a senior engineer. Be direct and specific.", body: "Review this {{language}} code. List bugs first, then style issues.\n\n{{code}}" },
  { title: "Tighten my writing", tag: "writing", system: "", body: "Rewrite the text below to be shorter and clearer. Keep my tone.\n\n{{text}}" },
];
const uid = () => Math.random().toString(36).slice(2, 10);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

let templates = read(LS, null) || SEED.map((t) => ({ ...t, id: uid(), provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL[DEFAULT_PROVIDER], values: {} }));
let current = templates[0]?.id || null;
let lastOut = null;

const save = () => localStorage.setItem(LS, JSON.stringify(templates));
// Fix: replace the retired Gemini model name saved in older templates
templates.forEach((t) => { if (t.model === "gemini-2.5-flash") t.model = DEFAULT_MODEL.gemini; });
save();
// One-time: move older saved templates to the free default provider
if (!localStorage.getItem("pl.free.v1")) {
  templates.forEach((t) => { t.provider = DEFAULT_PROVIDER; t.model = DEFAULT_MODEL[DEFAULT_PROVIDER]; });
  localStorage.setItem("pl.free.v1", "1"); save();
}
const find = () => templates.find((t) => t.id === current);
const varsOf = (t) => [...new Set([...(t.system + "\n" + t.body).matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((m) => m[1]))];
const fill = (s, v) => s.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => v[k] ?? "");
