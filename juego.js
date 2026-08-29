// ============================================================
// views/juego.js — "¿Quién quiere ser Procurador/a?"
// Escalera de 15 preguntas, comodines, puntos de seguridad.
// ============================================================
import { loadAll } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, shuffle, sample, uid, todayISO, toast } from "../utils.js";

const LADDER = [
  { label: "Auxiliar Administrativo", prize: 100 },
  { label: "Técnico Administrativo", prize: 250 },
  { label: "Sustanciador/a", prize: 500 },
  { label: "Profesional Universitario", prize: 1000 },
  { label: "Profesional Especializado", prize: 2000 },
  { label: "Coordinador/a de Grupo", prize: 4000 },
  { label: "Procurador/a Judicial II", prize: 8000 },
  { label: "Procurador/a Judicial I", prize: 16000 },
  { label: "Procurador/a Regional", prize: 32000 },
  { label: "Procurador/a Delegado/a", prize: 64000 },
  { label: "Director/a Nacional", prize: 125000 },
  { label: "Viceprocurador/a", prize: 250000 },
  { label: "Procurador/a Auxiliar", prize: 500000 },
  { label: "Procurador/a General (E)", prize: 1000000 },
  { label: "🏆 Procurador/a General de la Nación", prize: 2000000 },
];
const CHECKPOINTS = [4, 9]; // índices (0-based) que actúan como piso de puntos garantizados

export async function render(container, ctx){
  const { preguntas } = await loadAll();
  const best = load(KEYS.gameBest, 0);
  const view = el("div", { class: "view" });

  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, "15 preguntas · dificultad creciente · 3 comodines" ),
      el("h1", {}, "¿Quién quiere ser Procurador/a?"),
    ]),
    el("span", { class: "badge badge-gold" }, `Mejor puntaje: ${best.toLocaleString("es-CO")}`),
  ]));

  const intro = el("div", { class: "card", style: "text-align:center;" }, [
    el("p", {}, "Empiezas en Auxiliar Administrativo. Cada pregunta correcta te sube un escalón. Si fallas, bajas al último punto de seguridad que hayas pasado (escalón 5 y escalón 10). Tienes 3 comodines: 50/50, consultar tu glosario y saltar la pregunta."),
    el("button", { class: "btn btn-gold", id: "btn-play" }, "🎮 Empezar juego"),
  ]);
  view.appendChild(intro);

  const stage = el("div", { id: "game-stage" });
  view.appendChild(stage);

  container.innerHTML = "";
  container.appendChild(view);

  view.querySelector("#btn-play").addEventListener("click", () => startGame(stage, preguntas, container, ctx));
}

function buildDeck(preguntas){
  const valid = preguntas.filter(p => Array.isArray(p.opciones) && p.opciones.length >= 2);
  const facil = shuffle(valid.filter(p => p.respuesta_usuario_correcta));
  const dificil = shuffle(valid.filter(p => !p.respuesta_usuario_correcta));

  // Rampa: preguntas 1-5 fáciles, 6-10 mixtas, 11-15 difíciles — con reservas para el comodín de "salto".
  const tier1 = facil.splice(0, 7);
  const tier3 = dificil.splice(0, 7);
  const tier2 = shuffle([...facil.splice(0, 4), ...dificil.splice(0, 4)]);

  const main = [...tier1.slice(0,5), ...tier2.slice(0,5), ...tier3.slice(0,5)];
  const reserve = [...tier1.slice(5), ...tier2.slice(5), ...tier3.slice(5), ...facil, ...dificil];
  return { main, reserve: shuffle(reserve) };
}

function startGame(stage, preguntas, container, ctx){
  const { main, reserve } = buildDeck(preguntas);
  const state = {
    idx: 0,
    deck: main,
    reserve,
    lifelines: { fifty: true, glosario: true, salto: true },
    eliminated: new Set(),
  };

  function paint(){
    stage.innerHTML = "";
    if(state.idx >= state.deck.length){ return win(); }
    const q = state.deck[state.idx];

    const layout = el("div", { class: "game-layout" });
    const main = el("div", { class: "card" });
    main.appendChild(el("div", { class: "game-prize" }, `$${LADDER[state.idx].prize.toLocaleString("es-CO")}`));
    main.appendChild(el("p", { style: "text-align:center; margin-top:-.3rem;" }, `Escalón ${state.idx + 1}: ${LADDER[state.idx].label}`));
    main.appendChild(el("h3", {}, q.pregunta));

    const letters = "ABCDE";
    const optWrap = el("div", {});
    q.opciones.forEach((opt, i) => {
      if(state.eliminated.has(i)) return;
      const optEl = el("div", { class: "option" }, [
        el("span", { class: "letter" }, letters[i] || "•"),
        el("span", {}, opt.replace(/^[A-E][\.\):]\s*/i, "")),
      ]);
      optEl.addEventListener("click", () => answer(q, i, optWrap, main));
      optWrap.appendChild(optEl);
    });
    main.appendChild(optWrap);

    main.appendChild(el("div", { class: "lifelines" }, [
      lifelineBtn("½", state.lifelines.fifty, "Comodín 50/50", () => useFifty(q, optWrap)),
      lifelineBtn("📖", state.lifelines.glosario, "Consultar tu glosario", () => useGlosario()),
      lifelineBtn("⏭️", state.lifelines.salto, "Saltar esta pregunta", () => useSalto()),
    ]));
    main.appendChild(el("div", { style: "text-align:center; margin-top:1rem;" }, [
      el("button", { class: "btn btn-secondary btn-sm", onclick: () => walkAway(state.idx) }, "🚪 Retirarme con lo ganado"),
    ]));

    const ladder = el("div", { class: "card" }, [
      el("h4", { style: "margin-bottom:.6rem;" }, "Escalera"),
      el("div", { class: "ladder" }, LADDER.map((rung, i) => el("div", {
        class: "rung" + (i === state.idx ? " current" : i < state.idx ? " passed" : "")
      }, [
        el("span", {}, (CHECKPOINTS.includes(i) ? "🔒 " : "") + rung.label),
        el("span", { class: "amt" }, "$" + rung.prize.toLocaleString("es-CO")),
      ]))),
    ]);

    layout.appendChild(main);
    layout.appendChild(ladder);
    stage.appendChild(layout);
  }

  function lifelineBtn(icon, available, title, onClick){
    const btn = el("button", { class: "lifeline-btn", title }, icon);
    if(!available) btn.disabled = true;
    else btn.addEventListener("click", onClick);
    return btn;
  }

  function useFifty(q, optWrap){
    if(!state.lifelines.fifty) return;
    state.lifelines.fifty = false;
    const correct = q.opcion_correcta_indice;
    const wrongIdx = q.opciones.map((_, i) => i).filter(i => i !== correct && !state.eliminated.has(i));
    shuffle(wrongIdx).slice(0, Math.max(0, wrongIdx.length - 1)).forEach(i => state.eliminated.add(i));
    paint();
  }

  function useGlosario(){
    if(!state.lifelines.glosario) return;
    state.lifelines.glosario = false;
    toast("Abriendo tu glosario en otra sección — vuelve a esta pestaña del juego cuando termines");
    window.open("#glosario", "_blank");
    paint();
  }

  function useSalto(){
    if(!state.lifelines.salto || !state.reserve.length) return;
    state.lifelines.salto = false;
    state.deck[state.idx] = state.reserve.shift();
    state.eliminated = new Set();
    paint();
  }

  function answer(q, i, optWrap, main){
    if(optWrap.dataset.answered) return;
    optWrap.dataset.answered = "1";
    const correct = q.opcion_correcta_indice;
    const optionEls = optWrap.children;
    let visibleIdx = 0;
    q.opciones.forEach((opt, i2) => {
      if(state.eliminated.has(i2)) return;
      const node = optionEls[visibleIdx];
      if(i2 === correct) node.classList.add("correct");
      else if(i2 === i) node.classList.add("incorrect");
      visibleIdx++;
    });

    const isCorrect = i === correct;
    main.appendChild(el("div", { class: "quiz-explain " + (isCorrect ? "right" : "wrong") }, q.sustentacion_resumen || ""));

    if(isCorrect){
      main.appendChild(el("button", { class: "btn btn-gold", style: "margin-top:.9rem;", onclick: () => { state.idx++; paint(); } },
        state.idx + 1 >= state.deck.length ? "🏆 ¡Última pregunta superada!" : "Siguiente pregunta →"));
    }else{
      main.appendChild(el("button", { class: "btn btn-primary", style: "margin-top:.9rem;", onclick: () => lose(state.idx) }, "Ver resultado →"));
    }
  }

  function safeIndexBelow(idx){
    const passed = CHECKPOINTS.filter(c => c < idx);
    return passed.length ? LADDER[passed[passed.length - 1]].prize : 0;
  }

  function lose(idx){
    finish(safeIndexBelow(idx), idx);
  }
  function walkAway(idx){
    finish(idx === 0 ? 0 : LADDER[idx - 1].prize, idx);
  }
  function win(){
    finish(LADDER[LADDER.length - 1].prize, LADDER.length);
  }

  function finish(score, reachedIdx){
    const history = load(KEYS.gameHistory, []);
    history.push({ id: uid("game"), fecha: todayISO(), puntaje: score, escalonAlcanzado: reachedIdx });
    save(KEYS.gameHistory, history);
    const best = load(KEYS.gameBest, 0);
    if(score > best) save(KEYS.gameBest, score);

    stage.innerHTML = "";
    stage.appendChild(el("div", { class: "card", style: "text-align:center;" }, [
      el("span", { style: "font-size:2.4rem;" }, score >= LADDER[LADDER.length-1].prize ? "🏆" : "🎯"),
      el("h2", {}, `$${score.toLocaleString("es-CO")}`),
      el("p", {}, `Llegaste al escalón ${Math.min(reachedIdx + 1, LADDER.length)} de ${LADDER.length}.`),
      score > best ? el("p", { class: "badge badge-gold" }, "¡Nuevo mejor puntaje!") : null,
      el("button", { class: "btn btn-primary", onclick: () => render(container, ctx) }, "Jugar otra vez"),
    ]));
  }

  paint();
}
