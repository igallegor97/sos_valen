// ============================================================
// views/cronograma.js — las 14 semanas completas, marcables.
// ============================================================
import { loadAll } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, fmtDate, pct, todayISO, toast } from "../utils.js";

const TOOL_LABEL = { glosario:"Glosario", tarjetas:"Tarjetas", quiz:"Quiz", diario:"Diario de errores", juego:"Juego", simulacro:"Simulacro", ficha:"Ficha" };
const TOOL_ICON = { glosario:"📖", tarjetas:"🃏", quiz:"📝", diario:"🗒️", juego:"🎮", simulacro:"🧪", ficha:"🗂️" };
const TIPO_BADGE = { estudio:"badge-blue", quiz:"badge-gold", repaso:"badge-purple", simulacro:"badge-red", juego:"badge-green", descanso:"badge-neutral" };

export async function render(container, { goTo }){
  const { cronograma } = await loadAll();
  const doneMap = load(KEYS.cronogramaDone, {});
  const today = todayISO();

  const totalEventos = cronograma.fases.flatMap(f => f.eventos).length;
  const doneEventos = Object.values(doneMap).filter(Boolean).length;

  const view = el("div", { class: "view" });
  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, "29 ago — 29 nov 2026"),
      el("h1", {}, "Cronograma completo"),
    ]),
    el("div", { style: "min-width:220px;" }, [
      el("div", { class: "phase-progress" }, [
        el("div", { class: "progress" }, [el("span", { style: `width:${pct(doneEventos, totalEventos)}%` })]),
        el("span", {}, `${doneEventos}/${totalEventos}`),
      ]),
    ]),
  ]));

  cronograma.fases.forEach(fase => {
    view.appendChild(renderFase(fase, doneMap, today));
  });

  container.innerHTML = "";
  container.appendChild(view);
}

function renderFase(fase, doneMap, today){
  const doneCount = fase.eventos.filter(e => doneMap[e.id]).length;
  const isCurrent = today >= fase.inicio && today <= fase.fin;
  const card = el("div", { class: "card phase-card" });

  card.appendChild(el("div", { class: "phase-head" }, [
    el("div", {}, [
      el("h3", {}, `Fase ${fase.numero} · ${fase.nombre}`),
      el("span", { class: "phase-range" }, `${fmtDate(fase.inicio)} – ${fmtDate(fase.fin)}${isCurrent ? " · en curso" : ""}`),
    ]),
    el("button", { class: "btn btn-ghost btn-sm toggle-btn" }, isCurrent ? "Ocultar ▲" : "Ver semana ▾"),
  ]));

  card.appendChild(el("p", { style: "margin:.2rem 0 .6rem; font-size:.86rem;" }, fase.resumen));

  card.appendChild(el("div", { class: "phase-progress" }, [
    el("div", { class: "progress" }, [el("span", { style: `width:${pct(doneCount, fase.eventos.length)}%` })]),
    el("span", { style: "font-size:.78rem; color:var(--ink-faint);" }, `${doneCount}/${fase.eventos.length}`),
  ]));

  const list = el("div", { class: "day-list" + (isCurrent ? "" : " collapsed") });
  fase.eventos.forEach(ev => list.appendChild(renderEvento(ev, doneMap, today)));
  card.appendChild(list);

  card.querySelector(".toggle-btn").addEventListener("click", (e) => {
    const hidden = list.classList.toggle("collapsed");
    e.target.textContent = hidden ? "Ver semana ▾" : "Ocultar ▲";
  });

  return card;
}

function renderEvento(ev, doneMap, today){
  const checked = !!doneMap[ev.id];
  const isToday = ev.fecha === today;
  const row = el("div", { class: "task-row", style: isToday ? "background:var(--gold-soft); border-radius:8px; padding-left:.4rem;" : "" });

  const checkbox = el("input", { type: "checkbox", class: "task-check" });
  checkbox.checked = checked;
  checkbox.addEventListener("change", () => {
    doneMap[ev.id] = checkbox.checked;
    save(KEYS.cronogramaDone, doneMap);
    title.classList.toggle("done", checkbox.checked);
    toast(checkbox.checked ? "Marcado como hecho ✔️" : "Desmarcado");
  });

  const title = el("div", { class: "task-title" + (checked ? " done" : "") }, `${ev.claseEnVivo ? "🎓 " : ""}${ev.titulo}`);
  const meta = el("div", { class: "task-meta" }, [
    el("span", { class: "badge " + (TIPO_BADGE[ev.tipo] || "badge-neutral") }, `${ev.dia} ${fmtDate(ev.fecha)}`),
    ...(ev.herramientas || []).map(h => el("span", { class: "tag-pill" }, `${TOOL_ICON[h] || ""} ${TOOL_LABEL[h] || h}`)),
  ]);

  row.appendChild(checkbox);
  row.appendChild(el("div", { class: "task-body" }, [title, meta]));
  return row;
}
