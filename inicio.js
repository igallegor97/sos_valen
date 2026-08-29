// ============================================================
// views/inicio.js — dashboard: dónde vas, qué toca hoy, dónde flojeas.
// ============================================================
import { loadAll, statsPorTema, statsGlobal } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, colorForTema, todayISO, fmtDate, pct, toast } from "../utils.js";

function findCurrentPhase(cronograma, today){
  const fases = cronograma.fases;
  let current = fases.find(f => today >= f.inicio && today <= f.fin);
  if(current) return { fase: current, status: "en-curso" };
  if(today < fases[0].inicio) return { fase: fases[0], status: "por-empezar" };
  return { fase: fases[fases.length - 1], status: "terminado" };
}

function eventsForToday(cronograma, today, doneMap){
  const all = cronograma.fases.flatMap(f => f.eventos.map(e => ({ ...e, faseNombre: f.nombre })));
  let todays = all.filter(e => e.fecha === today);
  if(todays.length) return { label: "Hoy", events: todays };
  const upcoming = all.filter(e => e.fecha > today && !doneMap[e.id]).slice(0, 3);
  if(upcoming.length) return { label: "Próximo en el cronograma", events: upcoming };
  const recent = all.filter(e => e.fecha <= today).slice(-3);
  return { label: "Últimas del cronograma", events: recent };
}

function toolIcon(tool){
  return { glosario:"📖", tarjetas:"🃏", quiz:"📝", diario:"🗒️", juego:"🎮", simulacro:"🧪", ficha:"🗂️" }[tool] || "•";
}

export async function render(container, { goTo }){
  const { preguntas, glosario, cronograma } = await loadAll();
  const today = todayISO();
  const doneMap = load(KEYS.cronogramaDone, {});
  const flashState = load(KEYS.flashcards, {});
  const quizHistory = load(KEYS.quizHistory, []);
  const gameBest = load(KEYS.gameBest, 0);
  const errores = load(KEYS.errores, []);

  const global = statsGlobal(preguntas);
  const porTema = statsPorTema(preguntas).slice(0, 6);
  const { fase, status } = findCurrentPhase(cronograma, today);
  const { label: eventsLabel, events: todaysEvents } = eventsForToday(cronograma, today, doneMap);

  const dueToday = Object.entries(flashState).filter(([id, s]) => s.due <= today).length;
  const totalEventos = cronograma.fases.flatMap(f => f.eventos).length;
  const doneEventos = Object.values(doneMap).filter(Boolean).length;

  const lastQuiz = quizHistory[quizHistory.length - 1];
  const daysToExam = Math.round((new Date(cronograma.meta.fin) - new Date(today)) / 86400000);

  container.innerHTML = "";
  container.appendChild(el("div", { class: "view" }, [
    el("section", { class: "hero" }, [
      el("div", {}, [
        el("span", { class: "eyebrow", style: "color:#f0c463" }, "Concurso de carrera administrativa · PGN"),
        el("h1", {}, `Hola, Isabella 👋`),
        el("p", {}, status === "terminado"
          ? "Llegaste al final del plan. ¡A confiar en el proceso!"
          : status === "por-empezar"
            ? `El plan arranca el ${fmtDate(cronograma.meta.inicio)}. Faltan ${Math.max(daysToExam,0)} días para el cierre del plan (${fmtDate(cronograma.meta.fin)}).`
            : `Vas en "${fase.nombre}". Faltan ${Math.max(daysToExam,0)} días para el cierre del plan (${fmtDate(cronograma.meta.fin)}).`),
      ]),
      el("div", { class: "hero-cta" }, [
        el("button", { class: "btn btn-gold", onclick: () => goTo("quiz") }, "📝 Hacer el quiz de hoy"),
        el("button", { class: "btn btn-secondary", onclick: () => goTo("tarjetas") }, `🃏 Repasar tarjetas (${dueToday})`),
      ]),
    ]),

    el("div", { class: "grid grid-stats" }, [
      stat(global.pct + "%", "Diagnóstico inicial", "accent"),
      stat(String(preguntas.length), "Preguntas en el banco"),
      stat(String(glosario.length), "Términos en el glosario"),
      stat(String(dueToday), "Tarjetas para repasar hoy", dueToday > 0 ? "bad" : "good"),
      stat(lastQuiz ? lastQuiz.correctas + "/" + lastQuiz.total : "—", "Último quiz"),
      stat(String(gameBest), "Mejor puntaje del juego"),
    ]),

    el("div", { class: "grid grid-2" }, [
      el("div", { class: "card" }, [
        el("div", { class: "phase-head" }, [
          el("h3", {}, eventsLabel),
          el("span", { class: "badge badge-gold" }, fase.nombre),
        ]),
        todaysEvents.length
          ? el("div", {}, todaysEvents.map(ev => taskRow(ev, doneMap, container, goTo)))
          : el("div", { class: "empty" }, "No hay tareas registradas todavía."),
        el("div", { style: "margin-top:.8rem; text-align:right;" }, [
          el("button", { class: "btn btn-ghost btn-sm", onclick: () => goTo("cronograma") }, "Ver cronograma completo →"),
        ]),
      ]),

      el("div", { class: "card" }, [
        el("h3", {}, "Tus áreas más débiles (diagnóstico)"),
        el("p", { style: "margin-top:-.4rem; font-size:.82rem;" }, "Del simulacro de 183 preguntas — así se priorizó el cronograma."),
        el("div", { class: "chart-bars" }, porTema.map(t => chartRow(t))),
        el("div", { style: "margin-top:.6rem; text-align:right;" }, [
          el("button", { class: "btn btn-ghost btn-sm", onclick: () => goTo("progreso") }, "Ver todas las áreas →"),
        ]),
      ]),
    ]),

    el("div", { class: "card" }, [
      el("div", { class: "phase-progress" }, [
        el("strong", {}, "Avance del cronograma"),
        el("div", { class: "progress" }, [el("span", { style: `width:${pct(doneEventos, totalEventos)}%` })]),
        el("span", {}, `${doneEventos}/${totalEventos}`),
      ]),
      el("p", { style: "margin:0; font-size:.82rem;" },
        errores.length
          ? `Tienes ${errores.length} pregunta(s) en tu diario de errores esperando repaso.`
          : "Tu diario de errores está vacío por ahora — se va llenando solo cuando fallas en el quiz o el juego."),
    ]),
  ]));
}

function stat(num, label, tone){
  return el("div", { class: "card stat" + (tone ? " " + tone : "") }, [
    el("span", { class: "num" }, num),
    el("span", { class: "label" }, label),
  ]);
}

function chartRow(t){
  const color = t.pct < 40 ? "var(--red)" : t.pct < 60 ? "var(--gold)" : "var(--green)";
  return el("div", { class: "chart-row" }, [
    el("span", { class: "name", title: t.tema }, t.tema),
    el("div", { class: "chart-track" }, [el("div", { class: "chart-fill", style: `width:${t.pct}%; background:${color}` })]),
    el("span", { class: "pct" }, t.pct + "%"),
  ]);
}

function taskRow(ev, doneMap, container, goTo){
  const checked = !!doneMap[ev.id];
  const row = el("div", { class: "task-row" });
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
    el("span", { class: "badge badge-neutral" }, `${ev.dia} ${fmtDate(ev.fecha)}`),
    ...(ev.herramientas || []).map(h => el("span", { class: "badge badge-blue" }, h)),
  ]);
  row.appendChild(checkbox);
  row.appendChild(el("div", { class: "task-body" }, [title, meta]));
  return row;
}
