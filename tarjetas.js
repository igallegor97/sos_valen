// ============================================================
// views/tarjetas.js — tarjetas con repetición espaciada (Leitner).
// Caja 1→5, intervalos 1/3/7/16/30 días.
// ============================================================
import { loadAll } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, shuffle, todayISO, addDays, toast } from "../utils.js";

const INTERVALS = [1, 3, 7, 16, 30]; // índice = box-1

function cardsFromData(preguntas, glosario){
  const fromQuestions = preguntas.map(p => ({
    id: "q" + p.numero,
    tipo: "pregunta",
    tema: p.tema,
    front: p.pregunta,
    back: p.respuesta_correcta,
    extra: p.sustentacion_resumen + (p.normas_citadas ? ` (${p.normas_citadas})` : ""),
    prioridad: p.respuesta_usuario_correcta ? 0 : 1,
  }));
  const fromGlosario = glosario.map(g => ({
    id: "t" + g.id,
    tipo: "término",
    tema: g.tema,
    front: "¿Qué es: " + g.termino + "?",
    back: g.termino,
    extra: g.definicion,
    prioridad: 0,
  }));
  return [...fromQuestions, ...fromGlosario];
}

function buildQueue(cards, state, tema, sessionSize){
  const today = todayISO();
  const pool = tema === "todos" ? cards : cards.filter(c => c.tema === tema);

  const due = pool.filter(c => state[c.id] && state[c.id].due <= today);
  const failedNew = pool.filter(c => !state[c.id] && c.prioridad === 1);
  const otherNew = pool.filter(c => !state[c.id] && c.prioridad === 0);

  const queue = [...shuffle(due), ...shuffle(failedNew), ...shuffle(otherNew)];
  return queue.slice(0, sessionSize);
}

export async function render(container, ctx){
  const { preguntas, glosario, temas } = await loadAll();
  const cards = cardsFromData(preguntas, glosario);
  const state = load(KEYS.flashcards, {});

  const view = el("div", { class: "view" });
  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, "Repetición espaciada · Leitner 1–5"),
      el("h1", {}, "Tarjetas"),
    ]),
  ]));

  const dueCount = cards.filter(c => state[c.id] && state[c.id].due <= todayISO()).length;
  const newFailedCount = cards.filter(c => !state[c.id] && c.prioridad === 1).length;

  const setupCard = el("div", { class: "card" }, [
    el("div", { class: "grid grid-stats" }, [
      statBox(String(dueCount), "Para repasar hoy"),
      statBox(String(newFailedCount), "Nuevas (falladas en el diagnóstico)"),
      statBox(String(cards.length), "Tarjetas totales en el mazo"),
    ]),
    el("div", { class: "field", style: "max-width:320px; margin-top:1rem;" }, [
      el("label", {}, "Tema"),
      el("select", { id: "tema-select" }, [
        el("option", { value: "todos" }, "Todos los temas"),
        ...temas.map(t => el("option", { value: t }, t)),
      ]),
    ]),
    el("button", { class: "btn btn-primary", id: "btn-start" }, "🃏 Empezar sesión (20 tarjetas)"),
  ]);
  view.appendChild(setupCard);

  const stageSlot = el("div", { id: "stage-slot" });
  view.appendChild(stageSlot);

  container.innerHTML = "";
  container.appendChild(view);

  view.querySelector("#btn-start").addEventListener("click", () => {
    const tema = view.querySelector("#tema-select").value;
    const queue = buildQueue(cards, state, tema, 20);
    if(!queue.length){
      stageSlot.innerHTML = "";
      stageSlot.appendChild(el("div", { class: "empty" }, [
        el("span", { class: "big" }, "🎉"),
        "No hay tarjetas pendientes en ese tema por ahora. ¡Vuelve mañana o prueba con \"Todos los temas\"!",
      ]));
      return;
    }
    runSession(stageSlot, queue, state);
  });
}

function statBox(num, label){
  return el("div", { class: "stat" }, [el("span", { class: "num" }, num), el("span", { class: "label" }, label)]);
}

function runSession(slot, queue, state){
  let i = 0;
  let results = { again: 0, hard: 0, good: 0, easy: 0 };

  function paint(){
    slot.innerHTML = "";
    if(i >= queue.length){
      slot.appendChild(el("div", { class: "card flash-stage" }, [
        el("span", { style: "font-size:2.4rem;" }, "✅"),
        el("h3", {}, "Sesión terminada"),
        el("p", {}, `Otra vez: ${results.again} · Difícil: ${results.hard} · Bien: ${results.good} · Fácil: ${results.easy}`),
      ]));
      return;
    }
    const card = queue[i];
    const flash = el("div", { class: "flashcard" }, [
      el("div", { class: "flashcard-inner" }, [
        el("div", { class: "flashcard-face flashcard-front" }, [
          el("span", { class: "badge badge-blue tag" }, card.tema),
          el("div", { class: "txt" }, card.front),
          el("span", { class: "flashcard-hint" }, "Toca la tarjeta para ver la respuesta ↺"),
        ]),
        el("div", { class: "flashcard-face flashcard-back" }, [
          el("span", { class: "badge badge-green tag" }, "Respuesta"),
          el("div", { class: "txt" }, card.back),
          el("div", { class: "sust" }, card.extra || ""),
        ]),
      ]),
    ]);
    flash.addEventListener("click", () => flash.classList.toggle("flipped"));

    const grades = el("div", { class: "grade-row" }, [
      gradeBtn("grade-again", "Otra vez", "hoy mismo", () => grade(card, "again")),
      gradeBtn("grade-hard", "Difícil", "mañana", () => grade(card, "hard")),
      gradeBtn("grade-good", "Bien", nextIntervalLabel(state, card, 1), () => grade(card, "good")),
      gradeBtn("grade-easy", "Fácil", nextIntervalLabel(state, card, 2), () => grade(card, "easy")),
    ]);

    slot.appendChild(el("div", { class: "flash-stage" }, [
      el("span", { class: "hint" }, `Tarjeta ${i + 1} de ${queue.length}`),
      flash,
      grades,
    ]));
  }

  function grade(card, kind){
    const s = state[card.id] || { box: 0, reps: 0, lapses: 0 };
    let newBox = s.box;
    let due = todayISO();
    if(kind === "again"){ newBox = 1; due = todayISO(); s.lapses = (s.lapses||0) + 1; }
    else if(kind === "hard"){ newBox = Math.max(1, s.box); due = addDays(todayISO(), 1); }
    else if(kind === "good"){ newBox = Math.min(5, s.box + 1); due = addDays(todayISO(), INTERVALS[newBox - 1]); }
    else if(kind === "easy"){ newBox = Math.min(5, s.box + 2); due = addDays(todayISO(), Math.round(INTERVALS[newBox - 1] * 1.4)); }
    state[card.id] = { box: newBox, due, reps: (s.reps||0) + 1, lapses: s.lapses||0 };
    save(KEYS.flashcards, state);
    results[kind]++;
    i++;
    paint();
  }

  paint();
}

function nextIntervalLabel(state, card, bump){
  const s = state[card.id] || { box: 0 };
  const newBox = Math.min(5, s.box + bump);
  return `en ${INTERVALS[newBox - 1]} días`;
}

function gradeBtn(cls, label, sub, onClick){
  return el("button", { class: "btn grade-btn " + cls, onclick: onClick }, [label, el("small", {}, sub)]);
}
