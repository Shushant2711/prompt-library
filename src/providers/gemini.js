// Talks to Google Gemini (free tier available at aistudio.google.com)
module.exports = async function callGemini({ apiKey, model, system, prompt }) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Gemini API error " + r.status);
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new Error("Gemini returned no text" + (j.promptFeedback?.blockReason ? " (blocked: " + j.promptFeedback.blockReason + ")" : "."));
  return { text, usage: { in: j.usageMetadata?.promptTokenCount, out: j.usageMetadata?.candidatesTokenCount } };
};
