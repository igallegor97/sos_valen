// ============================================================
// app.js — cascarón de la aplicación: navegación, tema, modal
// de datos, y arranque de la carga de datos.
// ============================================================
import { loadAll } from "./data.js";
import { load, save, exportAll, importAll, resetAll, KEYS } from "./storage.js";
import { toast } from "./utils.js";

import { render as renderInicio } from "./views/inicio.js";
import { render as renderCronograma } from "./views/cronograma.js";
import { render as renderGlosario } from "./views/glosario.js";
import { render as renderTarjetas } from "./views/tarjetas.js";
import { render as renderQuiz } from "./views/quiz.js";
import { render as renderJuego } from "./views/juego.js";
import { render as renderBanco } from "./views/banco.js";
import { render as renderProgreso } from "./views/progreso.js";

const VIEWS = {
  inicio: { title: "Inicio", render: renderInicio },
  cronograma: { title: "Cronograma", render: renderCronograma },
  glosario: { title: "Glosario", render: renderGlosario },
  tarjetas: { title: "Tarjetas", render: renderTarjetas },
  quiz: { title: "Quiz semanal", render: renderQuiz },
  juego: { title: "¿Quién quiere ser Procurador/a?", render: renderJuego },
  banco: { title: "Banco de preguntas", render: renderBanco },
  progreso: { title: "Progreso y errores", render: renderProgreso },
};

const content = document.getElementById("content");
const topbarTitle = document.getElementById("topbar-title");

export function goTo(view){
  if(!VIEWS[view]) view = "inicio";
  location.hash = "#" + view;
}

async function renderView(view){
  if(!VIEWS[view]) view = "inicio";

  document.querySelectorAll(".nav-item").forEach(btn => {
    if(btn.dataset.view === view) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  topbarTitle.textContent = VIEWS[view].title;
  document.title = VIEWS[view].title + " · Ruta Procuraduría";

  content.innerHTML = '<div class="loading">Cargando…</div>';
  try{
    await VIEWS[view].render(content, { goTo });
  }catch(err){
    console.error(err);
    content.innerHTML = `<div class="empty"><span class="big">😕</span>Algo falló cargando esta sección.<br><small>${err.message || err}</small></div>`;
  }
  closeSidebarOnMobile();
}

window.addEventListener("hashchange", () => {
  renderView(location.hash.slice(1));
});

document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if(!btn) return;
  goTo(btn.dataset.view);
});

// ---------- sidebar móvil ----------
const sidebar = document.getElementById("sidebar");
function closeSidebarOnMobile(){
  if(window.innerWidth <= 920) sidebar.classList.remove("open");
}
document.getElementById("menu-toggle").addEventListener("click", () => sidebar.classList.toggle("open"));

// ---------- tema claro/oscuro ----------
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  const icon = theme === "dark" ? "☀️" : "🌙";
  document.getElementById("theme-toggle").textContent = icon;
  document.getElementById("theme-toggle-mobile").textContent = icon;
}
function toggleTheme(){
  const current = load(KEYS.theme, matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  save(KEYS.theme, next);
  applyTheme(next);
}
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("theme-toggle-mobile").addEventListener("click", toggleTheme);
applyTheme(load(KEYS.theme, matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

// ---------- modal exportar / importar ----------
const dataBackdrop = document.getElementById("data-modal-backdrop");
document.getElementById("data-toggle").addEventListener("click", () => { dataBackdrop.hidden = false; });
document.getElementById("data-modal-close").addEventListener("click", () => { dataBackdrop.hidden = true; });
dataBackdrop.addEventListener("click", (e) => { if(e.target === dataBackdrop) dataBackdrop.hidden = true; });

document.getElementById("btn-export").addEventListener("click", () => {
  const data = exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ruta-procuraduria-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Copia de seguridad descargada");
});

document.getElementById("import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const status = document.getElementById("import-status");
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    importAll(data);
    status.textContent = "✅ Datos importados. Recargando…";
    setTimeout(() => location.reload(), 900);
  }catch(err){
    status.textContent = "❌ No pude leer ese archivo: " + err.message;
  }
});

document.getElementById("btn-reset").addEventListener("click", () => {
  if(confirm("¿Seguro? Esto borra tarjetas, quizzes, el juego, el cronograma marcado, el diario de errores y lo que hayas agregado — en ESTE navegador. Si exportaste antes, puedes recuperarlo importando ese archivo.")){
    resetAll();
    toast("Progreso borrado");
    setTimeout(() => location.reload(), 600);
  }
});

// ---------- arranque ----------
(async function init(){
  try{
    await loadAll();
  }catch(err){
    content.innerHTML = `<div class="empty"><span class="big">🚫</span>No pude cargar los datos de estudio (data/*.json).<br><small>${err.message}</small><br><br><span class="hint">Si estás abriendo el archivo directamente (file://), corre un servidor local — ver el README.</span></div>`;
    return;
  }
  const initial = location.hash ? location.hash.slice(1) : "inicio";
  renderView(initial);
})();
