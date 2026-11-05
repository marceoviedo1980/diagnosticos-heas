/* Buscador de Diagnósticos HEAS
   Claves propias (prefijo "heasDx") para no chocar con otras PWA del mismo usuario de GitHub. */
const REPO_NOMBRE = "diagnosticos-heas";
const RAW_DATA_URL = "https://raw.githubusercontent.com/marceoviedo1980/" + REPO_NOMBRE + "/main/datos_heas.json?v=" + Date.now();
const LOCAL_DATA_URL = "datos_heas.json";
const RECENT_KEY = "heasDxRecientes";
const THEME_KEY = "heasDxTema";
const PAGE = 60;

const AMBITOS = [
  { k: "ce", label: "Consulta externa", short: "CE" },
  { k: "hosp", label: "Hospitalización", short: "Hosp." },
  { k: "emerg", label: "Emergencias", short: "Emerg." },
  { k: "uti", label: "Terapia intensiva", short: "UTI" },
  { k: "apoyo", label: "Servicios de apoyo", short: "Apoyo" }
];
const AMB = Object.fromEntries(AMBITOS.map((a) => [a.k, a]));

let servicios = [];   // [{a, e}]
let items = [];       // {c, n, g[], t, h, l}
let state = {
  tipo: "dx", ambito: "", esp: "", query: "", shown: PAGE,
  eView: null, eAmb: "", eTipo: "dx", eQuery: "", eLetter: "", eShown: PAGE
};
let searchTimer = null;

const $ = (s) => document.querySelector(s);
const el = {
  tabs: [...document.querySelectorAll(".tab")],
  viewBuscar: $("#viewBuscar"), viewEsp: $("#viewEsp"),
  form: $("#searchForm"), input: $("#searchInput"), clear: $("#clearButton"),
  recentBlock: $("#recentBlock"), recentList: $("#recentList"),
  tipoSwitch: $("#tipoSwitch"), ambitoFilters: $("#ambitoFilters"), espSelect: $("#espSelect"),
  counter: $("#resultCounter"), dataStatus: $("#dataStatus"), results: $("#results"), more: $("#moreBuscar"),
  espGridWrap: $("#espGridWrap"), espGrid: $("#espGrid"), espDetail: $("#espDetail"), backEsp: $("#backEsp"),
  espTitle: $("#espTitle"), espAmbTabs: $("#espAmbTabs"), tipoSwitchEsp: $("#tipoSwitchEsp"),
  espSearch: $("#espSearch"), espClear: $("#espClear"), espLetters: $("#espLetters"),
  espCounter: $("#espCounter"), espResults: $("#espResults"), moreEsp: $("#moreEsp"),
  themeToggle: $("#themeToggle"), themeIcon: $("#themeIcon"), themeLabel: $("#themeLabel"), version: $("#dataVersion")
};

/* ---------- utilidades ---------- */
function normChar(ch) { return ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
function normalize(value) { return Array.from(String(value || "")).map(normChar).join("").trim(); }
function make(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function safeGet(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ } }
const esCodigoDx = (c) => /^[A-Z]\d{2}(\.[\dA-Z]+)?$/.test(c);

/* resalta todos los términos buscados */
function highlight(text, terms) {
  const value = String(text || "");
  if (!terms.length) return document.createTextNode(value);
  const nv = Array.from(value).map(normChar).join("");
  const mask = new Array(value.length).fill(false);
  terms.forEach((t) => {
    if (!t) return;
    let i = nv.indexOf(t);
    while (i >= 0) { for (let k = i; k < i + t.length && k < mask.length; k++) mask[k] = true; i = nv.indexOf(t, i + t.length); }
  });
  const frag = document.createDocumentFragment();
  let i = 0;
  while (i < value.length) {
    let j = i;
    while (j < value.length && mask[j] === mask[i]) j++;
    const piece = value.slice(i, j);
    frag.append(mask[i] ? make("mark", "", piece) : document.createTextNode(piece));
    i = j;
  }
  return frag;
}

/* ---------- datos ---------- */
function prepararDatos(json) {
  servicios = json.servicios;
  items = json.items.map(([c, n, g]) => ({
    c, n, g, t: esCodigoDx(c) ? "dx" : "pr", h: normalize(c + " " + n), l: c[0], s: normalize(n).replace(/^[^a-z0-9]+/, "")
  }));
  el.version.textContent = `Datos actualizados: ${json.version} · ${items.length.toLocaleString("es")} registros`;
}
async function cargarDatos() {
  const intentos = [RAW_DATA_URL, LOCAL_DATA_URL];
  for (const url of intentos) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      prepararDatos(await r.json());
      el.dataStatus.classList.remove("visible"); el.dataStatus.textContent = "";
      return true;
    } catch (e) { console.warn("No se pudo cargar", url, e); }
  }
  el.dataStatus.textContent = "No se pudieron cargar los datos. Recargue la página.";
  el.dataStatus.classList.add("visible");
  return false;
}

/* ---------- consulta ---------- */
function ambitosDe(item, esp) {
  const out = new Map(); // ambito -> [especialidades]
  item.g.forEach((id) => {
    const s = servicios[id];
    if (esp && s.e !== esp) return;
    if (!out.has(s.a)) out.set(s.a, []);
    out.get(s.a).push(s.e);
  });
  return out;
}
function cumple(item, ambito, esp) {
  if (!ambito && !esp) return true;
  return item.g.some((id) => {
    const s = servicios[id];
    return (!ambito || s.a === ambito) && (!esp || s.e === esp);
  });
}
function puntaje(item, q, terms) {
  const code = normalize(item.c), name = normalize(item.n);
  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (terms.every((t) => name.split(/\W+/).some((w) => w.startsWith(t)))) return 3;
  return 4;
}
function consultar(query, tipo, ambito, esp) {
  const q = normalize(query);
  const terms = q.split(/\s+/).filter(Boolean);
  const res = items.filter((it) => it.t === tipo && terms.every((t) => it.h.includes(t)) && cumple(it, ambito, esp));
  if (terms.length) {
    const sc = new Map(res.map((it) => [it, puntaje(it, q, terms)]));
    res.sort((a, b) => sc.get(a) - sc.get(b) || a.s.localeCompare(b.s, "es"));
  } else {
    res.sort((a, b) => a.s.localeCompare(b.s, "es"));
  }
  return { res, terms };
}

/* ---------- tarjetas ---------- */
function tarjeta(item, terms, espFiltro) {
  const card = make("article", "result-card");
  card.append(make("div", "code-badge" + (item.t === "pr" ? " pr" : ""), item.c));
  const nombre = make("p", "service-name");
  nombre.append(highlight(item.n, terms));
  card.append(nombre);
  const blocks = make("div", "amb-blocks");
  const porAmb = ambitosDe(item, espFiltro);
  AMBITOS.forEach((a) => {
    if (!porAmb.has(a.k)) return;
    const row = make("div", `amb-row amb-${a.k}`);
    row.append(make("span", "amb-label", a.label));
    [...new Set(porAmb.get(a.k))].sort((x, y) => x.localeCompare(y, "es")).forEach((e) => row.append(make("span", "tag", e)));
    blocks.append(row);
  });
  card.append(blocks);
  return card;
}

/* ---------- vista BUSCAR ---------- */
function renderBuscar(append = false) {
  const hayFiltro = state.query.trim() || state.ambito || state.esp;
  if (!append) { el.results.innerHTML = ""; state.shown = PAGE; }
  if (!items.length) { el.counter.textContent = "Los datos aún se están cargando."; return; }
  if (!hayFiltro) {
    el.results.append(make("div", "empty-state", "Escriba un diagnóstico, procedimiento o código; o elija un ámbito o una especialidad para explorar."));
    el.counter.textContent = "Sin búsqueda activa."; el.more.hidden = true; return;
  }
  const { res, terms } = consultar(state.query, state.tipo, state.ambito, state.esp);
  const tipoTxt = state.tipo === "dx" ? "diagnóstico" : "procedimiento";
  el.counter.textContent = res.length
    ? `${res.length.toLocaleString("es")} ${tipoTxt}${res.length === 1 ? "" : "s"} encontrado${res.length === 1 ? "" : "s"}.`
    : "0 resultados.";
  if (!res.length) {
    el.results.innerHTML = "";
    const otro = consultar(state.query, state.tipo === "dx" ? "pr" : "dx", state.ambito, state.esp).res.length;
    el.results.append(make("div", "empty-state", otro
      ? `No hay ${tipoTxt}s con esos términos, pero hay ${otro} en ${state.tipo === "dx" ? "Procedimientos" : "Diagnósticos"}. Cambie el interruptor para verlos.`
      : "No se encontró nada. Pruebe con otros términos o quite filtros."));
    el.more.hidden = true; return;
  }
  el.results.innerHTML = "";
  res.slice(0, state.shown).forEach((it) => el.results.append(tarjeta(it, terms, state.esp)));
  el.more.hidden = res.length <= state.shown;
  el.more.textContent = `Mostrar más (${Math.min(PAGE, res.length - state.shown)} de ${res.length - state.shown} restantes)`;
}
function guardarReciente(q) {
  const limpio = q.trim(); if (limpio.length < 2) return;
  let lista = []; try { lista = JSON.parse(safeGet(RECENT_KEY, "[]")); } catch { lista = []; }
  lista = [limpio, ...lista.filter((x) => normalize(x) !== normalize(limpio))].slice(0, 6);
  safeSet(RECENT_KEY, JSON.stringify(lista)); renderRecientes();
}
function renderRecientes() {
  let lista = []; try { lista = JSON.parse(safeGet(RECENT_KEY, "[]")); } catch { lista = []; }
  el.recentList.innerHTML = ""; el.recentBlock.hidden = lista.length === 0;
  lista.forEach((q) => {
    const b = make("button", "recent-chip", q); b.type = "button";
    b.addEventListener("click", () => { el.input.value = q; state.query = q; renderBuscar(); });
    el.recentList.append(b);
  });
}
function construirFiltros() {
  el.ambitoFilters.innerHTML = "";
  const todos = make("button", "filter-chip active", "Todos"); todos.type = "button"; todos.dataset.amb = "";
  el.ambitoFilters.append(todos);
  AMBITOS.forEach((a) => {
    const b = make("button", "filter-chip"); b.type = "button"; b.dataset.amb = a.k;
    b.append(make("span", `dot dot-${a.k}`), document.createTextNode(a.label));
    el.ambitoFilters.append(b);
  });
  el.ambitoFilters.addEventListener("click", (ev) => {
    const b = ev.target.closest(".filter-chip"); if (!b) return;
    state.ambito = b.dataset.amb;
    [...el.ambitoFilters.children].forEach((c) => c.classList.toggle("active", c === b));
    renderBuscar();
  });
  const nombres = [...new Set(servicios.map((s) => s.e))].sort((a, b) => a.localeCompare(b, "es"));
  nombres.forEach((e) => { const o = make("option", "", e); o.value = e; el.espSelect.append(o); });
}

/* ---------- vista POR ESPECIALIDAD ---------- */
function statsServicios() {
  // por especialidad -> por ámbito -> {dx, pr}
  const m = new Map();
  items.forEach((it) => it.g.forEach((id) => {
    const s = servicios[id];
    if (!m.has(s.e)) m.set(s.e, {});
    const a = m.get(s.e); if (!a[s.a]) a[s.a] = { dx: 0, pr: 0 };
    a[s.a][it.t]++;
  }));
  return m;
}
function renderGridEsp() {
  const st = statsServicios();
  el.espGrid.innerHTML = "";
  const grupos = [["Servicios clínicos", (a) => a.ce || a.hosp], ["Emergencias y terapia intensiva", (a) => (a.emerg || a.uti) && !(a.ce || a.hosp)], ["Servicios de apoyo", (a) => a.apoyo && !(a.ce || a.hosp || a.emerg || a.uti)]];
  grupos.forEach(([titulo, filtro]) => {
    const lista = [...st.entries()].filter(([, a]) => filtro(a)).sort((x, y) => x[0].localeCompare(y[0], "es"));
    if (!lista.length) return;
    el.espGrid.append(make("div", "esp-group-title", titulo));
    lista.forEach(([e, a]) => {
      const b = make("button", "esp-card"); b.type = "button";
      b.append(make("div", "esp-name", e));
      const row = make("div", "esp-counts");
      AMBITOS.forEach((x) => { if (a[x.k]) row.append(make("span", `mini mini-${x.k}`, `${x.short} ${(a[x.k].dx + a[x.k].pr).toLocaleString("es")}`)); });
      b.append(row);
      b.addEventListener("click", () => abrirEsp(e));
      el.espGrid.append(b);
    });
  });
}
function abrirEsp(e) {
  state.eView = e; state.eQuery = ""; state.eLetter = ""; state.eTipo = "dx"; state.eShown = PAGE;
  el.espSearch.value = "";
  [...el.tipoSwitchEsp.children].forEach((c) => c.classList.toggle("active", c.dataset.tipo === "dx"));
  const st = statsServicios().get(e);
  const ambs = AMBITOS.filter((a) => st[a.k]);
  state.eAmb = ambs[0].k;
  el.espTitle.textContent = e;
  el.espAmbTabs.innerHTML = "";
  ambs.forEach((a) => {
    const b = make("button", "amb-tab" + (a.k === state.eAmb ? " active" : "")); b.type = "button"; b.dataset.amb = a.k;
    b.append(document.createTextNode(a.label), make("small", "", `${st[a.k].dx.toLocaleString("es")} diagnósticos · ${st[a.k].pr.toLocaleString("es")} procedimientos`));
    b.addEventListener("click", () => {
      state.eAmb = a.k; state.eLetter = ""; state.eShown = PAGE;
      [...el.espAmbTabs.children].forEach((c) => c.classList.toggle("active", c === b)); renderEsp();
    });
    el.espAmbTabs.append(b);
  });
  el.espGridWrap.hidden = true; el.espDetail.hidden = false; window.scrollTo(0, 0);
  renderEsp();
}
function itemsDeEsp() {
  return items.filter((it) => it.t === state.eTipo && it.g.some((id) => servicios[id].e === state.eView && servicios[id].a === state.eAmb));
}
function renderEsp(append = false) {
  const base = itemsDeEsp();
  // letras disponibles (solo diagnósticos)
  el.espLetters.innerHTML = "";
  if (state.eTipo === "dx") {
    const letras = [...new Set(base.map((i) => i.l))].sort();
    const todas = make("button", "letter all" + (state.eLetter ? "" : " active"), "Todas"); todas.type = "button";
    todas.addEventListener("click", () => { state.eLetter = ""; state.eShown = PAGE; renderEsp(); });
    el.espLetters.append(todas);
    letras.forEach((l) => {
      const b = make("button", "letter" + (state.eLetter === l ? " active" : ""), l); b.type = "button";
      b.addEventListener("click", () => { state.eLetter = state.eLetter === l ? "" : l; state.eShown = PAGE; renderEsp(); });
      el.espLetters.append(b);
    });
  }
  const terms = normalize(state.eQuery).split(/\s+/).filter(Boolean);
  let lista = base.filter((it) => (!state.eLetter || it.l === state.eLetter) && terms.every((t) => it.h.includes(t)));
  lista.sort((a, b) => terms.length ? puntaje(a, normalize(state.eQuery), terms) - puntaje(b, normalize(state.eQuery), terms) || a.s.localeCompare(b.s, "es") : a.s.localeCompare(b.s, "es"));
  const ambLabel = AMB[state.eAmb].label.toLowerCase();
  el.espCounter.textContent = `${lista.length.toLocaleString("es")} ${state.eTipo === "dx" ? "diagnósticos" : "procedimientos"} en ${state.eView} · ${ambLabel}`;
  el.espResults.innerHTML = "";
  if (!lista.length) el.espResults.append(make("div", "empty-state", "Sin resultados en esta especialidad con esos filtros."));
  lista.slice(0, state.eShown).forEach((it) => el.espResults.append(tarjetaEsp(it, terms)));
  el.moreEsp.hidden = lista.length <= state.eShown;
  el.moreEsp.textContent = `Mostrar más (${lista.length - state.eShown} restantes)`;
}
function tarjetaEsp(item, terms) {
  const card = make("article", "result-card");
  card.append(make("div", "code-badge" + (item.t === "pr" ? " pr" : ""), item.c));
  const nombre = make("p", "service-name"); nombre.append(highlight(item.n, terms)); card.append(nombre);
  // en qué ámbitos tiene ESTA especialidad ese registro
  const ambs = new Set(item.g.filter((id) => servicios[id].e === state.eView).map((id) => servicios[id].a));
  const blocks = make("div", "amb-blocks"); const row = make("div", "amb-row");
  AMBITOS.forEach((a) => { if (ambs.has(a.k)) { const t = make("span", `tag`, a.label); t.style.cssText = ""; row.append(wrapAmb(a, t)); } });
  blocks.append(row); card.append(blocks);
  return card;
}
function wrapAmb(a, tag) { const w = make("span", `amb-${a.k}`); w.append(tag); return w; }

/* ---------- tema, pestañas, eventos ---------- */
function aplicarTema(t) {
  const dark = t === "dark";
  document.body.classList.toggle("dark", dark);
  el.themeIcon.textContent = dark ? "☀️" : "🌙"; el.themeLabel.textContent = dark ? "CLAR" : "OSC";
  safeSet(THEME_KEY, t);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? "#0f3b36" : "#0f766e";
}
function cambiarVista(v) {
  el.tabs.forEach((t) => t.classList.toggle("active", t.dataset.view === v));
  el.viewBuscar.hidden = v !== "buscar"; el.viewEsp.hidden = v !== "especialidad";
  if (v === "especialidad" && !el.espGrid.children.length && items.length) renderGridEsp();
  window.scrollTo(0, 0);
}
function activarEventos() {
  el.tabs.forEach((t) => t.addEventListener("click", () => cambiarVista(t.dataset.view)));
  el.form.addEventListener("submit", (ev) => { ev.preventDefault(); state.query = el.input.value; renderBuscar(); guardarReciente(state.query); });
  el.input.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = el.input.value; renderBuscar(); }, 160); });
  el.clear.addEventListener("click", () => { el.input.value = ""; state.query = ""; el.input.focus(); renderBuscar(); });
  el.tipoSwitch.addEventListener("click", (ev) => {
    const b = ev.target.closest(".switch-opt"); if (!b) return;
    state.tipo = b.dataset.tipo; [...el.tipoSwitch.children].forEach((c) => c.classList.toggle("active", c === b)); renderBuscar();
  });
  el.espSelect.addEventListener("change", () => { state.esp = el.espSelect.value; renderBuscar(); });
  el.more.addEventListener("click", () => { state.shown += PAGE; renderBuscar(true); });
  el.backEsp.addEventListener("click", () => { el.espDetail.hidden = true; el.espGridWrap.hidden = false; window.scrollTo(0, 0); });
  el.tipoSwitchEsp.addEventListener("click", (ev) => {
    const b = ev.target.closest(".switch-opt"); if (!b) return;
    state.eTipo = b.dataset.tipo; state.eLetter = ""; state.eShown = PAGE;
    [...el.tipoSwitchEsp.children].forEach((c) => c.classList.toggle("active", c === b)); renderEsp();
  });
  el.espSearch.addEventListener("input", () => { state.eQuery = el.espSearch.value; state.eShown = PAGE; renderEsp(); });
  el.espClear.addEventListener("click", () => { el.espSearch.value = ""; state.eQuery = ""; state.eShown = PAGE; renderEsp(); });
  el.moreEsp.addEventListener("click", () => { state.eShown += PAGE; renderEsp(); });
  el.themeToggle.addEventListener("click", () => aplicarTema(document.body.classList.contains("dark") ? "light" : "dark"));
}
function registrarSW() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW no registrado", e));
}

document.addEventListener("DOMContentLoaded", async () => {
  aplicarTema(safeGet(THEME_KEY, "light"));
  activarEventos(); renderRecientes(); registrarSW();
  if (await cargarDatos()) { construirFiltros(); renderBuscar(); }
});
