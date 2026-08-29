// ============================================================
// utils.js — funciones chiquitas reutilizadas en varias vistas.
// ============================================================

export function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n){
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

export function uid(prefix = "id"){
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export function escapeHtml(str = ""){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function highlight(text, query){
  if(!query) return escapeHtml(text);
  const safe = escapeHtml(text);
  const q = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp("(" + q + ")", "ig"), "<mark>$1</mark>");
}

export function fmtDate(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function fmtDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function todayISO(){
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(aISO, bISO){
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

export function addDays(iso, n){
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function debounce(fn, ms = 200){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function pct(part, total){
  if(!total) return 0;
  return Math.round((part / total) * 100);
}

// Paleta consistente por tema, para barras/badges en toda la app.
const PALETTE = ["#2d6ca6", "#2f7a4f", "#b8860b", "#6b4f9e", "#b8433a", "#3f8f8f", "#a15a2e", "#5a6b8c"];
const colorCache = new Map();
export function colorForTema(tema){
  if(!colorCache.has(tema)){
    colorCache.set(tema, PALETTE[colorCache.size % PALETTE.length]);
  }
  return colorCache.get(tema);
}

export function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2600);
}

export function el(tag, attrs = {}, children = []){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if(key === "class") node.className = val;
    else if(key === "html") node.innerHTML = val;
    else if(key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2), val);
    else if(val !== null && val !== undefined) node.setAttribute(key, val);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if(c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}
