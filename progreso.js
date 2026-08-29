// ============================================================
// views/progreso.js — estadísticas por tema + diario de errores.
// ============================================================
import { loadAll, statsPorTema, statsGlobal } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, fmtDateTime, pct, toast } from "../utils.js";

const MOTIVOS = ["", "No sabía la norma", "Leí mal la pregunta", "Confundí dos figuras parecidas", "Error de cálculo/lógica", "Otro"];
const ESTADOS = ["pendiente", "en revisión", "dominada"];

export async function render(container, ctx){
  const { preguntas } = await loadAll();
  const quizHistory = load(KEYS.quizHistory, []);
  const gameHistory = load(KEYS.gameHistory, []);
  let errores = load(KEYS.errores, []);

  const diagnostico = statsPorTema(preguntas);
  const global = statsGlobal(preguntas);

  const view = el("div", { class: "view" });
  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, "Diagnóstico + tu historial" ),
      el("h1", {}, "Progreso y errores"),
    ]),
  ]));

  view.appendChild(el("div", { class: "grid grid-stats" }, [
    stat(global.pct + "%", "Diagnóstico global"),
    stat(String(quizHistory.length), "Quizzes hechos"),
    stat(String(gameHistory.length), "Partidas jugadas"),
    stat(String(errores.filter(e => e.estado !== "dominada").length), "Errores pendientes de dominar"),
  ]));

  view.appendChild(el("div", { class: "card" }, [
    el("h3", {}, "Desempeño por área (diagnóstico original)"),
    el("div", { class: "chart-bars" }, diagnostico.map(t => chartRow(t))),
  ]));

  view.appendChild(el("div", { class: "grid grid-2" }, [
    el("div", { class: "card" }, [
      el("h3", {}, "Historial de quizzes"),
      quizHistory.length
        ? el("div", { class: "table-wrap" }, [historyTable(quizHistory)])
        : el("div", { class: "empty" }, "Todavía no has hecho ningún quiz."),
    ]),
    el("div", { class: "card" }, [
      el("h3", {}, "Historial del juego"),
      gameHistory.length
        ? el("div", { class: "table-wrap" }, [gameTable(gameHistory)])
        : el("div", { class: "empty" }, "Todavía no has jugado."),
    ]),
  ]));

  const errorSlot = el("div", { class: "card", id: "error-slot" });
  view.appendChild(errorSlot);
  paintErrores(errorSlot, errores);

  container.innerHTML = "";
  container.appendChild(view);
}

function stat(num, label){
  return el("div", { class: "card stat" }, [el("span", { class: "num" }, num), el("span", { class: "label" }, label)]);
}

function chartRow(t){
  const color = t.pct < 40 ? "var(--red)" : t.pct < 60 ? "var(--gold)" : "var(--green)";
  return el("div", { class: "chart-row" }, [
    el("span", { class: "name", title: t.tema }, t.tema),
    el("div", { class: "chart-track" }, [el("div", { class: "chart-fill", style: `width:${t.pct}%; background:${color}` })]),
    el("span", { class: "pct" }, `${t.correctas}/${t.total}`),
  ]);
}

function historyTable(history){
  const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Fecha", "Alcance", "Resultado"].map(h => el("th", {}, h))))]);
  const tbody = el("tbody");
  [...history].reverse().slice(0, 15).forEach(h => {
    tbody.appendChild(el("tr", {}, [
      el("td", {}, fmtDateTime(h.fecha)),
      el("td", {}, h.alcance === "todos" ? "Mezcla" : h.alcance),
      el("td", {}, `${h.correctas}/${h.total} (${pct(h.correctas, h.total)}%)`),
    ]));
  });
  table.appendChild(tbody);
  return table;
}

function gameTable(history){
  const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Fecha", "Puntaje", "Escalón"].map(h => el("th", {}, h))))]);
  const tbody = el("tbody");
  [...history].reverse().slice(0, 15).forEach(h => {
    tbody.appendChild(el("tr", {}, [
      el("td", {}, fmtDateTime(h.fecha)),
      el("td", {}, "$" + h.puntaje.toLocaleString("es-CO")),
      el("td", {}, `${h.escalonAlcanzado}/15`),
    ]));
  });
  table.appendChild(tbody);
  return table;
}

function paintErrores(slot, errores){
  slot.innerHTML = "";
  slot.appendChild(el("h3", {}, "Diario de errores"));
  slot.appendChild(el("p", { style: "font-size:.82rem; margin-top:-.4rem;" }, "Se llena solo cuando fallas una pregunta en el quiz o el juego. Revísalo antes de cada quiz semanal."));

  if(!errores.length){
    slot.appendChild(el("div", { class: "empty" }, "Vacío por ahora — buena señal, o todavía no has hecho ningún quiz."));
    return;
  }

  const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Fecha", "Tema", "Pregunta", "Motivo", "Estado", ""].map(h => el("th", {}, h))))]);
  const tbody = el("tbody");
  [...errores].reverse().forEach(e => {
    const motivoSelect = el("select", {}, MOTIVOS.map(m => el("option", { value: m, selected: m === e.motivo ? "selected" : null }, m || "— elegir —")));
    motivoSelect.addEventListener("change", () => { e.motivo = motivoSelect.value; persist(errores); });

    const estadoSelect = el("select", {}, ESTADOS.map(s => el("option", { value: s, selected: s === e.estado ? "selected" : null }, s)));
    estadoSelect.addEventListener("change", () => { e.estado = estadoSelect.value; persist(errores); toast("Actualizado"); });

    const delBtn = el("button", { class: "btn btn-ghost btn-sm" }, "🗑️");
    delBtn.addEventListener("click", () => {
      const idx = errores.indexOf(e);
      if(idx > -1) errores.splice(idx, 1);
      persist(errores);
      paintErrores(slot, errores);
    });

    tbody.appendChild(el("tr", {}, [
      el("td", {}, fmtDateTime(e.fecha)),
      el("td", {}, el("span", { class: "badge badge-blue" }, e.tema)),
      el("td", { style: "max-width:280px;" }, e.pregunta),
      el("td", {}, motivoSelect),
      el("td", {}, estadoSelect),
      el("td", {}, delBtn),
    ]));
  });
  table.appendChild(tbody);
  slot.appendChild(el("div", { class: "table-wrap" }, [table]));
}

function persist(errores){ save(KEYS.errores, errores); }
