// ============================================================
// views/glosario.js — glosario buscable, filtrable y ampliable.
// ============================================================
import { loadAll, invalidate } from "../data.js";
import { load, save, KEYS } from "../storage.js";
import { el, highlight, escapeHtml, uid, debounce, toast } from "../utils.js";

let state = { query: "", tema: "todos" };

export async function render(container, ctx){
  const { glosario } = await loadAll();
  const temas = [...new Set(glosario.map(g => g.tema))].sort();

  const view = el("div", { class: "view" });
  view.appendChild(el("div", { class: "view-header" }, [
    el("div", {}, [
      el("span", { class: "eyebrow" }, `${glosario.length} términos`),
      el("h1", {}, "Glosario"),
    ]),
    el("button", { class: "btn btn-gold", id: "btn-add-term" }, "＋ Agregar término"),
  ]));

  const toolbar = el("div", { class: "card glossary-toolbar" }, [
    el("input", { type: "search", id: "term-search", placeholder: "Buscar término o definición…" }),
    el("select", { id: "term-tema" }, [
      el("option", { value: "todos" }, "Todos los temas"),
      ...temas.map(t => el("option", { value: t }, t)),
    ]),
  ]);
  view.appendChild(toolbar);

  const formSlot = el("div", { id: "term-form-slot" });
  view.appendChild(formSlot);

  const grid = el("div", { class: "grid grid-cards", id: "term-grid" });
  view.appendChild(grid);

  container.innerHTML = "";
  container.appendChild(view);

  const searchInput = view.querySelector("#term-search");
  searchInput.value = state.query;
  const temaSelect = view.querySelector("#term-tema");
  temaSelect.value = state.tema;

  function refresh(){
    renderGrid(grid, glosario);
  }

  searchInput.addEventListener("input", debounce((e) => { state.query = e.target.value.trim(); refresh(); }, 150));
  temaSelect.addEventListener("change", (e) => { state.tema = e.target.value; refresh(); });

  view.querySelector("#btn-add-term").addEventListener("click", () => {
    if(formSlot.firstChild){ formSlot.innerHTML = ""; return; }
    formSlot.appendChild(buildAddForm(temas, async () => {
      formSlot.innerHTML = "";
      invalidate();
      await render(container, ctx);
    }));
  });

  refresh();
}

function renderGrid(grid, glosario){
  const q = state.query.toLowerCase();
  const filtered = glosario.filter(g => {
    const matchesTema = state.tema === "todos" || g.tema === state.tema;
    const matchesQuery = !q || g.termino.toLowerCase().includes(q) || g.definicion.toLowerCase().includes(q);
    return matchesTema && matchesQuery;
  });

  grid.innerHTML = "";
  if(!filtered.length){
    grid.appendChild(el("div", { class: "empty", style: "grid-column:1/-1;" }, [
      el("span", { class: "big" }, "🔎"),
      "No encontré términos con ese filtro.",
    ]));
    return;
  }

  filtered.forEach(g => {
    grid.appendChild(el("div", { class: "card term-card" }, [
      el("div", { style: "display:flex; justify-content:space-between; gap:.5rem;" }, [
        el("h4", { html: highlight(g.termino, state.query) }),
        g.propio ? el("span", { class: "badge badge-gold" }, "tuyo") : el("span", { class: "badge badge-neutral" }, g.tema),
      ]),
      el("p", { html: highlight(g.definicion, state.query) }),
    ]));
  });
}

function buildAddForm(temas, onSaved){
  const wrap = el("div", { class: "card", style: "border-color:var(--gold-bright);" });
  wrap.appendChild(el("h3", {}, "Nuevo término"));

  const nameInput = el("input", { type: "text", placeholder: "Término (ej. Cosa juzgada)" });
  const temaInput = el("input", { type: "text", placeholder: "Tema (ej. Derecho Procesal)", list: "temas-existentes" });
  const datalist = el("datalist", { id: "temas-existentes" }, temas.map(t => el("option", { value: t })));
  const defInput = el("textarea", { rows: "3", placeholder: "Definición, en tus propias palabras…" });

  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Término"), nameInput]));
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Tema"), temaInput, datalist]));
  wrap.appendChild(el("div", { class: "field" }, [el("label", {}, "Definición"), defInput]));

  wrap.appendChild(el("div", { class: "modal-actions" }, [
    el("button", { class: "btn btn-primary", onclick: () => {
      const termino = nameInput.value.trim();
      const tema = temaInput.value.trim() || "General";
      const definicion = defInput.value.trim();
      if(!termino || !definicion){ toast("Falta el término o la definición"); return; }
      const extra = load(KEYS.glosarioExtra, []);
      extra.push({ id: uid("term"), tema, termino, definicion, propio: true });
      save(KEYS.glosarioExtra, extra);
      toast("Término agregado ✅");
      onSaved();
    }}, "Guardar término"),
  ]));

  return wrap;
}
