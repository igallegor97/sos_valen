// ============================================================
// storage.js — todo lo que toca localStorage vive aquí.
// Nada de tu progreso sale de tu navegador salvo que lo exportes.
// ============================================================

const PREFIX = "rp_"; // Ruta Procuraduría

// Claves que participan en exportar / importar / borrar todo.
export const KEYS = {
  theme: "theme",
  cronogramaDone: "cronograma_done",   // { [eventId]: true }
  flashcards: "flashcards",            // { [cardId]: {box, due, reps, lapses} }
  quizHistory: "quiz_history",         // [{id, fecha, alcance, total, correctas, porTema}]
  gameHistory: "game_history",         // [{id, fecha, puntaje, escalonAlcanzado}]
  gameBest: "game_best",               // number
  errores: "errores",                  // [{id, fecha, preguntaId, pregunta, tema, motivo, estado, origen}]
  glosarioExtra: "glosario_extra",     // [{id, tema, termino, definicion, propio:true}]
  preguntasExtra: "preguntas_extra",   // [ ...misma forma que preguntas.json, propio:true]
};

function k(key){ return PREFIX + key; }

export function load(key, fallback){
  try{
    const raw = localStorage.getItem(k(key));
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.warn("No se pudo leer", key, e);
    return fallback;
  }
}

export function save(key, value){
  try{
    localStorage.setItem(k(key), JSON.stringify(value));
    return true;
  }catch(e){
    console.warn("No se pudo guardar", key, e);
    return false;
  }
}

export function remove(key){
  try{ localStorage.removeItem(k(key)); }catch(e){ /* noop */ }
}

// ---------- export / import / reset de TODO ----------

export function exportAll(){
  const data = { _meta: { app: "ruta-procuraduria", exportado: new Date().toISOString() } };
  Object.values(KEYS).forEach(key => { data[key] = load(key, null); });
  return data;
}

export function importAll(data){
  if(!data || typeof data !== "object") throw new Error("Archivo inválido");
  Object.values(KEYS).forEach(key => {
    if(key in data && data[key] !== null && data[key] !== undefined){
      save(key, data[key]);
    }
  });
}

export function resetAll(){
  Object.values(KEYS).forEach(key => remove(key));
}
