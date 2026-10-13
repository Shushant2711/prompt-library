// Talks to OpenAI (ChatGPT)
module.exports = async function callOpenAI({ apiKey, model, system, prompt }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
    body: JSON.stringify({ model, messages }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "OpenAI API error " + r.status);
  return {
    text: j.choices?.[0]?.message?.content || "",
    usage: { in: j.usage?.prompt_tokens, out: j.usage?.completion_tokens },
  };
};
