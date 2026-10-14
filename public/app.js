// UI LAYER: drawing the screen and handling clicks
let activeTag = "";
let runNow = () => {};

function el(tag, props = {}, ...kids) {
  const e = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => e.append(k));
  return e;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1700);
}

function card(title, hint, ...kids) {
  return el("div", { className: "card" }, el("div", { className: "card-h" }, el("h3", { textContent: title }), el("span", { textContent: hint })), ...kids);
}

function renderTags() {
  const tags = [...new Set(templates.map((t) => t.tag).filter(Boolean))];
  if (activeTag && !tags.includes(activeTag)) activeTag = "";
  const box = $("#tags");
  box.innerHTML = "";
  if (!tags.length) return;
  ["", ...tags].forEach((v) => {
    const b = el("button", { className: "chip" + (activeTag === v ? " on" : ""), textContent: v || "All" });
    b.onclick = () => { activeTag = v; renderList(); };
    box.append(b);
  });
}

function renderList() {
  renderTags();
  const q = $("#q").value.toLowerCase();
  const ul = $("#list");
  ul.innerHTML = "";
  const shown = templates.filter((t) => (!activeTag || t.tag === activeTag) && (t.title + t.tag + t.body).toLowerCase().includes(q));
  if (!shown.length) ul.append(el("li", { className: "none", textContent: "No templates match." }));
  shown.forEach((t) => {
    const n = varsOf(t).length;
    const li = el("li", { className: t.id === current ? "on" : "" },
      el("div", { className: "row" }, el("span", { className: "t", textContent: t.title || "Untitled" }), t.tag ? el("span", { className: "pill", textContent: t.tag }) : ""),
      el("div", { className: "snip", textContent: (t.body || "Empty prompt").replace(/\s+/g, " ").slice(0, 80) }),
      el("div", { className: "g", textContent: `${n} ${n === 1 ? "variable" : "variables"} · ${LABEL[t.provider] || t.provider}` }));
    li.onclick = () => { current = t.id; lastOut = null; renderList(); renderEditor(); };
    ul.append(li);
  });
}

function previewNodes(t) {
  const out = [], re = /\{\{\s*([\w-]+)\s*\}\}/g, s = t.body || "";
  let last = 0, m;
  while ((m = re.exec(s))) {
    out.push(s.slice(last, m.index));
    const v = t.values[m[1]];
    out.push(v ? el("mark", { textContent: v }) : el("mark", { className: "empty", textContent: "{{" + m[1] + "}}" }));
    last = re.lastIndex;
  }
  out.push(s.slice(last));
  return out;
}

function renderVars(t, box, onChange) {
  box.innerHTML = "";
  const vs = varsOf(t);
  if (!vs.length) { box.append(el("div", { className: "hint", textContent: "No variables yet. Write {{name}} in the prompt to add one." })); return; }
  vs.forEach((v) => {
    const ta = el("textarea", { rows: 2, value: t.values[v] || "", placeholder: "Value for " + v });
    ta.oninput = () => { t.values[v] = ta.value; save(); onChange(); };
    box.append(el("div", {}, el("span", { textContent: "{{" + v + "}}" }), ta));
  });
}

function renderOut(box) {
  box.innerHTML = "";
  if (!lastOut) { box.append(el("div", { className: "hint", textContent: "Run the prompt to see the reply here." })); return; }
  if (lastOut.loading) { box.append(el("div", { className: "loading" }, el("i"), el("i"), el("i"), " Waiting for the model")); return; }
  if (lastOut.error) { box.append(el("div", { className: "out err", textContent: lastOut.error })); return; }
  const copy = el("button", { textContent: "Copy reply" });
  copy.onclick = () => { navigator.clipboard.writeText(lastOut.text); toast("Reply copied"); };
  box.append(
    el("div", { className: "meta" }, el("span", { textContent: `${(lastOut.ms / 1000).toFixed(1)}s · ${lastOut.usage.in ?? "?"} in · ${lastOut.usage.out ?? "?"} out` }), copy),
    el("div", { className: "out", textContent: lastOut.text })
  );
}

function renderEditor() {
  const t = find(), ed = $("#editor");
  ed.innerHTML = "";
  if (!t) {
    const b = el("button", { className: "primary", textContent: "+ New template" });
    b.onclick = () => $("#newBtn").click();
    ed.append(el("div", { className: "empty-state" }, el("h3", { textContent: "No templates yet" }), el("p", { textContent: "Write your first prompt and test it on Gemini, Groq, Claude or OpenAI." }), b));
    return;
  }
  const bind = (node, key, after) => { node.value = t[key] || ""; node.oninput = () => { t[key] = node.value; save(); renderList(); after && after(); }; return node; };
  const vbox = el("div", { className: "vars" }), obox = el("div"), stats = el("div", { className: "stats" }), prev = el("div", { className: "preview" });
  const update = () => {
    const n = (t.body || "").length;
    stats.textContent = `${n} characters · about ${Math.ceil(n / 4)} tokens · ${varsOf(t).length} variables`;
    prev.replaceChildren(...previewNodes(t));
  };
  const refresh = () => { renderVars(t, vbox, update); update(); };

  const title = bind(el("input", { className: "title", placeholder: "Template title" }), "title");
  const tag = bind(el("input", { className: "tag", placeholder: "Add a tag, like coding or writing" }), "tag");
  const sys = bind(el("textarea", { rows: 3, placeholder: "Optional. Sets the role or rules." }), "system", refresh);
  const body = bind(el("textarea", { rows: 9, placeholder: "Write your prompt. Use {{variable}} for blanks." }), "body", refresh);

  const dup = el("button", { className: "ghost", textContent: "Duplicate" });
  dup.onclick = () => {
    const c = { ...t, id: uid(), title: (t.title || "Untitled") + " copy", values: { ...t.values } };
    templates.unshift(c); current = c.id; lastOut = null; save(); renderList(); renderEditor(); toast("Template duplicated");
  };
  const del = el("button", { className: "ghost danger", textContent: "Delete" });
  del.onclick = () => {
    if (!confirm(`Delete "${t.title || "Untitled"}"?`)) return;
    templates = templates.filter((x) => x.id !== t.id);
    current = templates[0]?.id || null; lastOut = null; save(); renderList(); renderEditor(); toast("Template deleted");
  };

  const model = el("input", { className: "field", value: t.model, placeholder: "Model name" });
  model.oninput = () => { t.model = model.value; save(); };
  const seg = el("div", { className: "seg" });
  Object.entries(LABEL).forEach(([v, label]) => {
    const b = el("button", { textContent: label, className: t.provider === v ? "on" : "" });
    b.onclick = () => {
      t.provider = v; t.model = model.value = DEFAULT_MODEL[v]; save(); renderList();
      [...seg.children].forEach((c) => c.classList.toggle("on", c === b));
    };
    seg.append(b);
  });

  const run = el("button", { className: "primary", textContent: "Run prompt" });
  runNow = async () => {
    if (run.disabled) return;
    run.disabled = true; run.textContent = "Running...";
    lastOut = { loading: true }; renderOut(obox);
    const keys = read(KS, {});
    try {
      const r = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: t.provider, model: t.model, system: fill(t.system, t.values), prompt: fill(t.body, t.values), apiKey: keys[t.provider] }) });
      const j = await r.json();
      lastOut = r.ok ? j : { error: j.error || "Request failed" };
    } catch { lastOut = { error: "Could not reach the server. Check your connection." }; }
    run.disabled = false; run.textContent = "Run prompt"; renderOut(obox);
  };
  run.onclick = runNow;

  ed.append(
    el("div", { className: "ed-head" }, el("div", { className: "ed-title" }, title, tag), el("div", { className: "ed-actions" }, dup, del)),
    el("div", { className: "grid" },
      el("div", { className: "col" },
        card("System prompt", "Sets the role or rules", sys),
        card("Prompt", "Use {{variable}} for blanks", body, stats),
        card("Variables", "Fill these before running", vbox)),
      el("div", { className: "col" },
        el("div", { className: "card" }, el("div", { className: "runbar" }, seg, model, run), el("div", { className: "kbd", textContent: "Tip: press Ctrl + Enter to run" })),
        card("Filled prompt", "What will be sent", prev),
        card("Reply", "From the model", obox)))
  );
  refresh(); renderOut(obox);
}

$("#newBtn").onclick = () => {
  const t = { id: uid(), title: "", tag: "", system: "", body: "", provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL[DEFAULT_PROVIDER], values: {} };
  templates.unshift(t); current = t.id; lastOut = null; save(); renderList(); renderEditor();
  $(".title").focus();
};
$("#q").oninput = renderList;
$("#themeBtn").onclick = () => {
  const d = document.documentElement;
  d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("pl.theme", d.dataset.theme);
};
$("#exportBtn").onclick = () => {
  const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(templates, null, 2)], { type: "application/json" })), download: "prompt-library.json" });
  a.click(); toast("Exported");
};
$("#importBtn").onclick = () => $("#file").click();
$("#file").onchange = async (e) => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data)) throw 0;
    data.forEach((t) => templates.push({ provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL[DEFAULT_PROVIDER], values: {}, system: "", tag: "", ...t, id: uid() }));
    save(); renderList(); toast(data.length + " templates imported");
  } catch { alert("That file is not a valid template export."); }
  e.target.value = "";
};
$("#settingsBtn").onclick = () => { const k = read(KS, {}); $("#kG").value = k.gemini || ""; $("#kS").value = k.groq || ""; $("#kA").value = k.anthropic || ""; $("#kO").value = k.openai || ""; $("#dlg").showModal(); };
$("#kClose").onclick = () => $("#dlg").close();
$("#kSave").onclick = () => { localStorage.setItem(KS, JSON.stringify({ gemini: $("#kG").value.trim(), groq: $("#kS").value.trim(), anthropic: $("#kA").value.trim(), openai: $("#kO").value.trim() })); $("#dlg").close(); toast("Keys saved"); };
document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runNow(); });

save(); renderList(); renderEditor();
