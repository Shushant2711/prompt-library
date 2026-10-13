// Talks to Anthropic (Claude)
module.exports = async function callClaude({ apiKey, model, system, prompt }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 1500,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Claude API error " + r.status);
  return {
    text: j.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
    usage: { in: j.usage?.input_tokens, out: j.usage?.output_tokens },
  };
};
