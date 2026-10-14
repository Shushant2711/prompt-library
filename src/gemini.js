// Talks to Google Gemini (free tier available at aistudio.google.com)
const RETIRED = { "gemini-2.5-flash": "gemini-3.8-flash" }; // old names Google no longer allows
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function callGemini({ apiKey, model, system, prompt }) {
  const name = RETIRED[model] || model;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(name) + ":generateContent";
  const body = JSON.stringify({
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let r, j;
  for (let attempt = 0; attempt < 3; attempt++) {
    r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body });
    j = await r.json();
    if (r.status !== 503 && r.status !== 429) break; // retry only when Google is busy
    await wait(1500 * (attempt + 1));
  }
  if (!r.ok) throw new Error(j.error?.message || "Gemini API error " + r.status);
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error("Gemini returned no text" + (j.promptFeedback?.blockReason ? " (blocked: " + j.promptFeedback.blockReason + ")" : "."));
  return { text, usage: { in: j.usageMetadata?.promptTokenCount, out: j.usageMetadata?.candidatesTokenCount } };
};
