// ============================================================
// data.js — carga los JSON base (data/*.json) y los fusiona con
// lo que hayas agregado tú (preguntas propias, términos propios).
// ============================================================
import { load, KEYS } from "./storage.js";

let _cache = null;

async function fetchJSON(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error("No pude cargar " + path);
  return res.json();
}

// El PDF original trae ~150 sub-etiquetas muy finas (una por matiz de pregunta).
// Para que el quiz, las tarjetas y las gráficas sean usables, las agrupamos en
// las mismas 19 áreas macro que se usaron para diagnosticar y priorizar el
// cronograma. La sub-etiqueta original se conserva en `subtema` por si acaso.
function macroTema(sub){
  const t = (sub || "").toLowerCase();
  if(t.includes("competencias comportamentales")) return "Competencias Comportamentales";
  if(t.includes("razonamiento matem") || t.includes("estad")) return "Razonamiento Matemático/Estadística";
  if(t.includes("razonamiento") || t.includes("pensamiento") || t.includes("metodolog")) return "Razonamiento Lógico/Analítico";
  if(t.includes("tutela") || t.includes("constituci") || t.includes("accion")) return "Constitución Política/Derechos Fundamentales";
  if(t.includes("ofimát") || t.includes("ofimat")) return "Ofimática";
  if(t.includes("comercio exterior") || t.includes("incoterms")) return "Comercio Exterior/Incoterms";
  if(t.includes("tributario") || t.includes("aduaner") || t.includes("dian")) return "Derecho Tributario y Aduanero (DIAN)";
  if(t.includes("presupuesto") || t.includes("bpin") || t.includes("inversión pública") || t.includes("inversion publica") || t.includes("mga")) return "Presupuesto y Proyectos de Inversión Pública";
  if(t.includes("redacci") || t.includes("ortografía") || t.includes("ortografia")) return "Redacción y Ortografía";
  if(t.includes("gestión documental") || t.includes("gestion documental") || t.includes("archiv")) return "Gestión Documental/Archivística";
  if(t.includes("transparencia") || t.includes("habeas data")) return "Transparencia y Acceso a Información";
  if(t.includes("petici")) return "Derecho de Petición";
  if(t.includes("inhabilidad") || t.includes("contrataci")) return "Contratación Estatal/Régimen de Inhabilidades";
  if(t.includes("gestión de bienes") || t.includes("gestion de bienes") || t.includes("recursos físicos") || t.includes("recursos fisicos")) return "Gestión de Bienes/Recursos Físicos";
  if(t.includes("mipg") || t.includes("gestión integral") || t.includes("gestion integral") || t.includes("sgi")) return "MIPG/Gestión Integral";
  if(t.includes("disciplinario")) return "Derecho Disciplinario";
  if(t.includes("administrativo") && !t.includes("función")) return "Derecho Administrativo (CPACA)";
  if(t.includes("función pública") || t.includes("funcion publica") || t.includes("jal") || t.includes("desconcentr") || t.includes("delegaci") || t.includes("descentraliz") || t.includes("ética") || t.includes("etica")) return "Función Pública/Estructura del Estado";
  return "Otros";
}

export async function loadAll(){
  if(_cache) return _cache;

  const [preguntasBaseRaw, glosarioBase, cronograma] = await Promise.all([
    fetchJSON("data/preguntas.json"),
    fetchJSON("data/glosario.json"),
    fetchJSON("data/cronograma.json"),
  ]);

  // Agrupa las preguntas originales en las 19 áreas macro del diagnóstico.
  const preguntasBase = preguntasBaseRaw.map(p => ({ ...p, subtema: p.tema, tema: macroTema(p.tema) }));

  const preguntasExtra = load(KEYS.preguntasExtra, []);
  const glosarioExtra = load(KEYS.glosarioExtra, []);

  const preguntas = [...preguntasBase, ...preguntasExtra];
  const glosario = [...glosarioBase, ...glosarioExtra];

  const temas = [...new Set(preguntas.map(p => p.tema))].sort();

  _cache = { preguntas, preguntasBase, glosario, glosarioBase, cronograma, temas };
  return _cache;
}

// Invalida la caché en memoria (llamar después de agregar preguntas/términos)
export function invalidate(){ _cache = null; }

// ---------- estadísticas derivadas del banco (diagnóstico original) ----------

export function statsPorTema(preguntas){
  const map = new Map();
  for(const p of preguntas){
    if(!map.has(p.tema)) map.set(p.tema, { tema: p.tema, total: 0, correctas: 0 });
    const s = map.get(p.tema);
    s.total++;
    if(p.respuesta_usuario_correcta) s.correctas++;
  }
  return [...map.values()]
    .map(s => ({ ...s, pct: s.total ? Math.round((s.correctas / s.total) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);
}

export function statsGlobal(preguntas){
  const total = preguntas.length;
  const correctas = preguntas.filter(p => p.respuesta_usuario_correcta).length;
  return { total, correctas, incorrectas: total - correctas, pct: total ? Math.round((correctas/total)*100) : 0 };
}
