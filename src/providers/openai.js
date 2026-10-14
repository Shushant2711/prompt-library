// Talks to OpenAI, and to any OpenAI-compatible service (like Groq) via baseUrl
module.exports = async function callOpenAI({ apiKey, model, system, prompt, baseUrl = "https://api.openai.com/v1", name = "OpenAI" }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const r = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
    body: JSON.stringify({ model, messages }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || name + " API error " + r.status);
  return {
    text: j.choices?.[0]?.message?.content || "",
    usage: { in: j.usage?.prompt_tokens, out: j.usage?.completion_tokens },
  };
};
