// UI LAYER: drawing the screen and button clicks
function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => e.append(k));
  return e;
}

function renderList() {
  const q = $("#q").value.toLowerCase();
  const ul = $("#list"); ul.innerHTML = "";
  templates.filter((t) => (t.title + t.tag).toLowerCase().includes(q)).forEach((t) => {
    const li = el("li", { className: t.id === current ? "on" : "" }, el("div", { className: "t", textContent: t.title || "Untitled" }), el("div", { className: "g", textContent: t.tag || "no tag" }));
    li.onclick = () => { current = t.id; lastOut = null; renderList(); renderEditor(); };
    ul.append(li);
  });
}

function renderVars(t, box) {
  box.innerHTML = "";
  const vs = varsOf(t);
  if (!vs.length) { box.append(el("div", { className: "empty", textContent: "No variables yet. Write {{name}} in the prompt to add one." })); return; }
  vs.forEach((v) => {
    const ta = el("textarea", { rows: 2, value: t.values[v] || "" });
    ta.oninput = () => { t.values[v] = ta.value; save(); };
    box.append(el("div", {}, el("span", { textContent: "{{" + v + "}}" }), ta));
  });
}

function renderOut(box) {
  box.innerHTML = "";
  if (!lastOut) { box.append(el("div", { className: "empty", textContent: "Run the prompt to see the reply here." })); return; }
  if (lastOut.error) { box.append(el("div", { className: "out err", textContent: lastOut.error })); return; }
  const copy = el("button", { textContent: "Copy reply" });
  copy.onclick = () => { navigator.clipboard.writeText(lastOut.text); copy.textContent = "Copied"; };
  box.append(el("div", { className: "meta" }, el("span", { textContent: `${(lastOut.ms / 1000).toFixed(1)}s, ${lastOut.usage.in ?? "?"} tokens in, ${lastOut.usage.out ?? "?"} out` }), copy), el("div", { className: "out", textContent: lastOut.text }));
}

function renderEditor() {
  const t = find(), ed = $("#editor"); ed.innerHTML = "";
  if (!t) { ed.append(el("p", { className: "empty", textContent: "No templates. Press New to write your first one." })); return; }
  const bind = (node, key, after) => { node.value = t[key] || ""; node.oninput = () => { t[key] = node.value; save(); renderList(); after && after(); }; return node; };
  const vbox = el("div", { className: "vars" }), obox = el("div");
  const refresh = () => renderVars(t, vbox);
  const title = bind(el("input", { className: "title", placeholder: "Template title" }), "title");
  const tag = bind(el("input", { className: "tag", placeholder: "Add a tag, like coding or writing" }), "tag");
  const sys = bind(el("textarea", { rows: 3, placeholder: "Optional. Sets the role or rules." }), "system", refresh);
  const body = bind(el("textarea", { rows: 8, placeholder: "Write your prompt. Use {{variable}} for blanks." }), "body", refresh);
  const prov = el("select", {}, el("option", { value: "anthropic", textContent: "Claude" }), el("option", { value: "openai", textContent: "OpenAI" }));
  prov.value = t.provider;
  const model = el("input", { className: "field", value: t.model, placeholder: "Model name" });
  model.oninput = () => { t.model = model.value; save(); };
  prov.onchange = () => { t.provider = prov.value; t.model = model.value = DEFAULT_MODEL[prov.value]; save(); };
  const run = el("button", { className: "primary", textContent: "Run prompt" });
  run.onclick = async () => {
    run.disabled = true; run.textContent = "Running...";
    const keys = read(KS, {});
    try {
      const r = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: t.provider, model: t.model, system: fill(t.system, t.values), prompt: fill(t.body, t.values), apiKey: t.provider === "openai" ? keys.openai : keys.anthropic }) });
      const j = await r.json();
      lastOut = r.ok ? j : { error: j.error || "Request failed" };
    } catch { lastOut = { error: "Could not reach the server. Check your connection." }; }
    run.disabled = false; run.textContent = "Run prompt"; renderOut(obox);
  };
  ed.append(title, tag, el("label", { className: "l", textContent: "System prompt" }), sys, el("label", { className: "l", textContent: "Prompt" }), body, el("label", { className: "l", textContent: "Fill the variables" }), vbox, el("div", { className: "bar" }, prov, model, run), obox);
  refresh(); renderOut(obox);
}

$("#newBtn").onclick = () => { const t = { id: uid(), title: "", tag: "", system: "", body: "", provider: "anthropic", model: DEFAULT_MODEL.anthropic, values: {} }; templates.unshift(t); current = t.id; lastOut = null; save(); renderList(); renderEditor(); };
$("#delBtn").onclick = () => { const t = find(); if (!t || !confirm(`Delete "${t.title || "Untitled"}"?`)) return; templates = templates.filter((x) => x.id !== t.id); current = templates[0]?.id || null; save(); renderList(); renderEditor(); };
$("#q").oninput = renderList;
$("#exportBtn").onclick = () => { const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(templates, null, 2)], { type: "application/json" })), download: "prompt-library.json" }); a.click(); };
$("#importBtn").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data)) throw 0;
    data.forEach((t) => templates.push({ provider: "anthropic", model: DEFAULT_MODEL.anthropic, values: {}, system: "", tag: "", ...t, id: uid() }));
    save(); renderList();
  } catch { alert("That file is not a valid template export."); }
  e.target.value = "";
};
$("#settingsBtn").onclick = () => { const k = read(KS, {}); $("#kA").value = k.anthropic || ""; $("#kO").value = k.openai || ""; $("#dlg").showModal(); };
$("#kClose").onclick = () => $("#dlg").close();
$("#kSave").onclick = () => { localStorage.setItem(KS, JSON.stringify({ anthropic: $("#kA").value.trim(), openai: $("#kO").value.trim() })); $("#dlg").close(); };

save(); renderList(); renderEditor();
