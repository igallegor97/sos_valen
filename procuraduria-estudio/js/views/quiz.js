// ============================================================
// views/quiz.js — quiz de opción múltiple: ~70% tema elegido +
// ~30% repaso intercalado de otros temas, como manda el plan.
// ============================================================
import { loadAll } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, shuffle, sample, uid, todayISO, pct, toast } from "../utils.js";

export async function render(container, ctx){
  const { preguntas, temas } = await loadAll();
  const view = el("div", { class: "view" });

  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, "70% tema de la semana + 30% repaso acumulado"),
      el("h1", {}, "Quiz semanal"),
    ]),
  ]));

  const setup = el("div", { class: "card quiz-setup" }, [
    el("div", { class: "field" }, [
      el("label", {}, "Tema principal"),
      el("select", { id: "q-tema" }, [
        el("option", { value: "todos" }, "Mezcla de todos los temas"),
        ...temas.map(t => el("option", { value: t }, t)),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", {}, "Número de preguntas"),
      el("select", { id: "q-count" }, [
        el("option", { value: "10" }, "10 (rápido)"),
        el("option", { value: "15", selected: "selected" }, "15 (estándar)"),
        el("option", { value: "20" }, "20 (a fondo)"),
      ]),
    ]),
    el("button", { class: "btn btn-primary", id: "btn-start-quiz" }, "📝 Empezar quiz"),
  ]);
  view.appendChild(setup);

  const stage = el("div", { id: "quiz-stage" });
  view.appendChild(stage);

  container.innerHTML = "";
  container.appendChild(view);

  view.querySelector("#btn-start-quiz").addEventListener("click", () => {
    const tema = view.querySelector("#q-tema").value;
    const count = parseInt(view.querySelector("#q-count").value, 10);
    const set = buildQuizSet(preguntas, tema, count);
    runQuiz(stage, set, tema);
  });
}

function buildQuizSet(preguntas, tema, count){
  const valid = preguntas.filter(p => Array.isArray(p.opciones) && p.opciones.length >= 2);
  if(tema === "todos") return sample(valid, count);

  const principal = valid.filter(p => p.tema === tema);
  const resto = valid.filter(p => p.tema !== tema);

  const nPrincipal = Math.round(count * 0.7);
  const nResto = count - nPrincipal;
  return shuffle([...sample(principal, nPrincipal), ...sample(resto, nResto)]);
}

function runQuiz(stage, set, temaLabel){
  let i = 0;
  const answers = []; // {pregunta, correcta, elegida}

  function paint(){
    stage.innerHTML = "";
    if(!set.length){
      stage.appendChild(el("div", { class: "empty" }, "No hay suficientes preguntas con opciones para este filtro todavía."));
      return;
    }
    if(i >= set.length){ return finish(); }

    const q = set[i];
    const card = el("div", { class: "card" });
    card.appendChild(el("div", { class: "quiz-progress-row" }, [
      el("span", { class: "badge badge-blue" }, q.tema),
      el("div", { class: "progress", style: "flex:1;" }, [el("span", { style: `width:${pct(i, set.length)}%` })]),
      el("span", { class: "hint" }, `${i + 1}/${set.length}`),
    ]));
    card.appendChild(el("h3", { style: "margin-top:.9rem;" }, q.pregunta));

    const optionsWrap = el("div", {});
    const letters = "ABCDE";
    q.opciones.forEach((opt, idx) => {
      const optEl = el("div", { class: "option" }, [
        el("span", { class: "letter" }, letters[idx] || "•"),
        el("span", {}, opt.replace(/^[A-E][\.\):]\s*/i, "")),
      ]);
      optEl.addEventListener("click", () => choose(q, idx, optEl, optionsWrap, card));
      optionsWrap.appendChild(optEl);
    });
    card.appendChild(optionsWrap);
    stage.appendChild(card);
  }

  function choose(q, idx, optEl, optionsWrap, card){
    if(optionsWrap.dataset.answered) return;
    optionsWrap.dataset.answered = "1";
    const correctIdx = q.opcion_correcta_indice;
    [...optionsWrap.children].forEach((child, ci) => {
      if(ci === correctIdx) child.classList.add("correct");
      else if(ci === idx) child.classList.add("incorrect");
    });
    const isCorrect = idx === correctIdx;
    answers.push({ numero: q.numero, tema: q.tema, pregunta: q.pregunta, correcta: isCorrect });

    const explain = el("div", { class: "quiz-explain " + (isCorrect ? "right" : "wrong") }, [
      el("strong", {}, isCorrect ? "✅ Correcto. " : "❌ No era esa. "),
      q.sustentacion_resumen,
      q.normas_citadas ? el("div", { class: "hint", style: "margin-top:.3rem;" }, q.normas_citadas) : null,
    ]);
    card.appendChild(explain);
    card.appendChild(el("button", { class: "btn btn-primary", style: "margin-top:.9rem;", onclick: () => { i++; paint(); } },
      i + 1 < set.length ? "Siguiente →" : "Ver resultado →"));
  }

  function finish(){
    const correctas = answers.filter(a => a.correcta).length;
    const total = answers.length;
    const porTema = {};
    answers.forEach(a => {
      porTema[a.tema] = porTema[a.tema] || { total: 0, correctas: 0 };
      porTema[a.tema].total++;
      if(a.correcta) porTema[a.tema].correctas++;
    });

    const history = load(KEYS.quizHistory, []);
    history.push({ id: uid("quiz"), fecha: todayISO(), alcance: temaLabel, total, correctas, porTema });
    save(KEYS.quizHistory, history);

    const errores = load(KEYS.errores, []);
    answers.filter(a => !a.correcta).forEach(a => {
      errores.push({
        id: uid("err"), fecha: todayISO(), preguntaId: a.numero, pregunta: a.pregunta,
        tema: a.tema, motivo: "", estado: "pendiente", origen: "quiz",
      });
    });
    save(KEYS.errores, errores);

    const p = pct(correctas, total);
    stage.innerHTML = "";
    stage.appendChild(el("div", { class: "card", style: "text-align:center;" }, [
      el("div", { class: "score-ring", style: `--pct:${p};` }, [
        el("div", { class: "score-ring-inner" }, [el("b", {}, p + "%"), el("span", {}, `${correctas}/${total}`)]),
      ]),
      el("h3", { style: "margin-top:1rem;" }, p >= 70 ? "¡Muy bien! 🎉" : p >= 50 ? "Vas por buen camino 💪" : "Toca reforzar este tema 📚"),
      el("p", {}, total - correctas > 0
        ? `Las ${total - correctas} que fallaste ya quedaron en tu diario de errores.`
        : "Ni una sola fallada — excelente."),
      el("button", { class: "btn btn-secondary", onclick: () => location.hash = "#progreso" }, "Ver mi progreso →"),
    ]));
    toast("Quiz guardado en tu historial");
  }

  paint();
}
