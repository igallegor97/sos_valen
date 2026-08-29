// ============================================================
// views/banco.js — explora el banco de 183+ preguntas y agrega
// las tuyas propias (las de nuevos quizzes del curso, por ejemplo).
// ============================================================
import { loadAll, invalidate } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, uid, debounce, toast } from "../utils.js";

let state = { query: "", tema: "todos", resultado: "todos" };

export async function render(container, ctx){
  const { preguntas, temas } = await loadAll();

  const view = el("div", { class: "view" });
  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, `${preguntas.length} preguntas`),
      el("h1", {}, "Banco de preguntas"),
    ]),
    el("button", { class: "btn btn-gold", id: "btn-add-q" }, "＋ Agregar pregunta"),
  ]));

  view.appendChild(el("div", { class: "card filter-row" }, [
    el("input", { type: "search", id: "b-search", placeholder: "Buscar en el enunciado…" }),
    el("select", { id: "b-tema" }, [el("option", { value: "todos" }, "Todos los temas"), ...temas.map(t => el("option", { value: t }, t))]),
    el("select", { id: "b-resultado" }, [
      el("option", { value: "todos" }, "Todas"),
      el("option", { value: "falladas" }, "Solo las que fallaste"),
      el("option", { value: "acertadas" }, "Solo las que acertaste"),
      el("option", { value: "propias" }, "Solo las que agregaste tú"),
    ]),
  ]));

  const formSlot = el("div", { id: "q-form-slot" });
  view.appendChild(formSlot);

  const tableSlot = el("div", { class: "card table-wrap", id: "q-table-slot" });
  view.appendChild(tableSlot);

  container.innerHTML = "";
  container.appendChild(view);

  view.querySelector("#b-search").addEventListener("input", debounce(e => { state.query = e.target.value.trim().toLowerCase(); paintTable(tableSlot, preguntas); }, 150));
  view.querySelector("#b-tema").addEventListener("change", e => { state.tema = e.target.value; paintTable(tableSlot, preguntas); });
  view.querySelector("#b-resultado").addEventListener("change", e => { state.resultado = e.target.value; paintTable(tableSlot, preguntas); });

  view.querySelector("#btn-add-q").addEventListener("click", () => {
    if(formSlot.firstChild){ formSlot.innerHTML = ""; return; }
    formSlot.appendChild(buildForm(temas, async () => {
      formSlot.innerHTML = "";
      invalidate();
      await render(container, ctx);
    }));
  });

  paintTable(tableSlot, preguntas);
}

function paintTable(slot, preguntas){
  const filtered = preguntas.filter(p => {
    if(state.tema !== "todos" && p.tema !== state.tema) return false;
    if(state.resultado === "falladas" && p.respuesta_usuario_correcta) return false;
    if(state.resultado === "acertadas" && !p.respuesta_usuario_correcta) return false;
    if(state.resultado === "propias" && !p.propio) return false;
    if(state.query && !p.pregunta.toLowerCase().includes(state.query)) return false;
    return true;
  });

  slot.innerHTML = "";
  if(!filtered.length){
    slot.appendChild(el("div", { class: "empty" }, "No hay preguntas con ese filtro."));
    return;
  }

  const table = el("table", {}, [
    el("thead", {}, el("tr", {}, ["#", "Tema", "Pregunta", "Resultado", ""].map(h => el("th", {}, h)))),
  ]);
  const tbody = el("tbody");
  filtered.slice(0, 200).forEach(p => {
    tbody.appendChild(el("tr", {}, [
      el("td", {}, String(p.numero ?? "—")),
      el("td", {}, el("span", { class: "badge badge-blue" }, p.tema)),
      el("td", { style: "max-width:420px;" }, p.pregunta),
      el("td", {}, p.propio
        ? el("span", { class: "badge badge-gold" }, "tuya")
        : el("span", { class: "badge " + (p.respuesta_usuario_correcta ? "badge-green" : "badge-red") }, p.respuesta_usuario_correcta ? "acertada" : "fallada")),
      el("td", {}, el("details", {}, [el("summary", { style: "cursor:pointer; color:var(--blue); font-size:.8rem;" }, "ver"), el("p", { style: "font-size:.82rem; max-width:360px;" }, p.sustentacion_resumen)])),
    ]));
  });
  table.appendChild(tbody);
  slot.appendChild(table);
  if(filtered.length > 200) slot.appendChild(el("p", { class: "hint" }, `Mostrando 200 de ${filtered.length}. Filtra más para ver el resto.`));
}

function buildForm(temas, onSaved){
  const wrap = el("div", { class: "card", style: "border-color:var(--gold-bright);" });
  wrap.appendChild(el("h3", {}, "Nueva pregunta"));
  wrap.appendChild(el("p", { style: "font-size:.82rem;" }, "Para cuando el curso te dé un quiz o simulacro nuevo — así el banco (y el quiz, las tarjetas y el juego) crecen con vos."));

  const temaInput = el("input", { type: "text", placeholder: "Tema (ej. Derecho Disciplinario)", list: "b-temas" });
  const datalist = el("datalist", { id: "b-temas" }, temas.map(t => el("option", { value: t })));
  const preguntaInput = el("textarea", { rows: "2", placeholder: "Enunciado de la pregunta" });
  const opcionesWrap = el("div", { id: "opciones-wrap" });
  const letters = "ABCDE";
  const opcionInputs = [];
  for(let i = 0; i < 4; i++){
    const inp = el("input", { type: "text", placeholder: `Opción ${letters[i]}` });
    opcionInputs.push(inp);
    opcionesWrap.appendChild(el("div", { class: "field" }, [el("label", {}, `Opción ${letters[i]}`), inp]));
  }
  const correctSelect = el("select", {}, letters.slice(0,4).split("").map((L, i) => el("option", { value: i }, L)));
  const sustInput = el("textarea", { rows: "2", placeholder: "Sustentación / por qué es correcta" });
  const normasInput = el("input", { type: "text", placeholder: "Normas citadas (opcional)" });

  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Tema"), temaInput, datalist]));
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Pregunta"), preguntaInput]));
  wrap.appendChild(opcionesWrap);
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Opción correcta"), correctSelect]));
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Sustentación"), sustInput]));
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Normas citadas"), normasInput]));

  wrap.appendChild(el("div", { class: "modal-actions" }, [
    el("button", { class: "btn btn-primary", onclick: () => {
      const tema = temaInput.value.trim();
      const pregunta = preguntaInput.value.trim();
      const opciones = opcionInputs.map((inp, i) => `${letters[i]}. ${inp.value.trim()}`).filter(o => o.length > 3);
      if(!tema || !pregunta || opciones.length < 2){ toast("Falta tema, pregunta o al menos 2 opciones"); return; }
      const idx = parseInt(correctSelect.value, 10);

      const extra = load(KEYS.preguntasExtra, []);
      const numero = 1000 + extra.length; // fuera del rango 1-183 del banco original
      extra.push({
        numero, tema, pregunta,
        respuesta_correcta: opciones[idx],
        respuesta_usuario_correcta: true,
        sustentacion_resumen: sustInput.value.trim(),
        normas_citadas: normasInput.value.trim(),
        opciones, opcion_correcta_indice: idx,
        propio: true,
      });
      save(KEYS.preguntasExtra, extra);
      toast("Pregunta agregada al banco ✅");
      onSaved();
    }}, "Guardar pregunta"),
  ]));

  return wrap;
}
