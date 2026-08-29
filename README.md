# Ruta Procuraduría — Profesional Asesor

Plataforma personal de estudio para el concurso de carrera administrativa de la Procuraduría General de la Nación (cargo Profesional Asesor). Es un sitio **estático** (HTML + CSS + JS puro, sin frameworks ni paso de build) pensado para vivir en un repositorio de GitHub y publicarse gratis con GitHub Pages.

Incluye: dashboard de avance, el cronograma completo (29 ago – 29 nov 2026) marcable día a día, un glosario buscable y ampliable, tarjetas de repetición espaciada (Leitner), un quiz semanal de opción múltiple, el juego "¿Quién quiere ser Procurador/a?", un banco de preguntas ampliable, y un panel de progreso con diario de errores automático.

## 1. Cómo funciona (importante antes de tocar nada)

- **No hay backend.** Todo — tarjetas repasadas, resultados de quizzes, partidas del juego, casillas marcadas en el cronograma, términos y preguntas que agregues — se guarda en el `localStorage` de **tu navegador**, en **este dispositivo**.
- Eso significa: si cambias de computador, usas otro navegador, o borras los datos de navegación, pierdes el progreso guardado — **a menos que lo exportes primero**.
- Por eso el botón 💾 (arriba a la izquierda) abre "Tus datos", con:
  - **Exportar mis datos**: descarga un `.json` con todo tu progreso. Hazlo cada semana o dos.
  - **Importar datos**: recupera un backup, o pásate el progreso a otro dispositivo/navegador.
  - **Borrar todo mi progreso**: por si quieres empezar de cero.
- El contenido base (las 183 preguntas del simulacro, el glosario semilla, el cronograma) vive en `data/*.json` y se sirve igual para cualquiera que abra el sitio — eso sí queda en el repositorio de GitHub, versionado.

## 2. Ver el sitio en tu computador (antes de publicarlo)

Como el sitio carga los datos con `fetch()`, **no funciona abriendo `index.html` directamente con doble clic** (los navegadores bloquean `fetch` sobre `file://`). Necesitas un servidor local, cualquiera de estas opciones sirve:

```bash
# Opción 1: Python (ya viene instalado en Mac/Linux)
cd ruta-procuraduria
python3 -m http.server 8000
# abre http://localhost:8000

# Opción 2: extensión "Live Server" de VS Code
# clic derecho sobre index.html → "Open with Live Server"

# Opción 3: Node
npx serve .
```

## 3. Publicarlo con GitHub Pages (gratis)

1. Crea un repositorio nuevo en GitHub (puede ser privado o público — si es privado, GitHub Pages necesita un plan que lo permita; si no, hazlo público, igual nadie va a intuir la URL).
2. Sube todo el contenido de esta carpeta a la raíz del repo:
   ```bash
   cd ruta-procuraduria
   git init
   git add .
   git commit -m "Primera versión de Ruta Procuraduría"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, elige la rama `main` y la carpeta `/ (root)`. Guarda.
4. En un par de minutos tu sitio queda en `https://TU-USUARIO.github.io/TU-REPO/`. Guárdalo como marcador o agrégalo a la pantalla de inicio del celular (en Chrome/Safari: "Agregar a pantalla de inicio") para que se sienta como una app.

Cada vez que quieras actualizar algo (agregar preguntas al banco de forma permanente, corregir el cronograma, etc.), edita los archivos y vuelve a hacer `git add . && git commit -m "..." && git push` — GitHub Pages se actualiza solo.

## 4. Estructura del proyecto

```
ruta-procuraduria/
├── index.html            → esqueleto de la página + barra de navegación
├── css/styles.css        → todo el diseño (colores, tipografía, componentes)
├── js/
│   ├── app.js             → arranque, navegación entre vistas, tema claro/oscuro, exportar/importar
│   ├── data.js             → carga data/*.json y agrupa las preguntas en 19 áreas temáticas
│   ├── storage.js          → todo lo que toca localStorage
│   ├── utils.js             → funciones chiquitas reutilizadas (fechas, mezclar arrays, etc.)
│   └── views/
│       ├── inicio.js        → dashboard
│       ├── cronograma.js    → cronograma completo, marcable
│       ├── glosario.js      → glosario buscable + agregar términos
│       ├── tarjetas.js      → flashcards con repetición espaciada
│       ├── quiz.js          → quiz semanal de opción múltiple
│       ├── juego.js         → "¿Quién quiere ser Procurador/a?"
│       ├── banco.js         → explorar el banco + agregar preguntas
│       └── progreso.js      → estadísticas + diario de errores
└── data/
    ├── preguntas.json      → las 183 preguntas del simulacro (con opciones y sustentación)
    ├── glosario.json       → ~46 términos base
    └── cronograma.json     → las 14 fases del plan, día por día
```

## 5. Cómo agregar contenido nuevo

### Preguntas de un quiz o simulacro nuevo del curso
La forma más simple: usa el botón **"＋ Agregar pregunta"** en la sección *Banco de preguntas*. Queda guardada en tu navegador y ya alimenta el quiz, las tarjetas y el juego.

Para dejarlo **permanente** (que quede en el repositorio y no dependa de un solo navegador): exporta tus datos (sección 1), copia los objetos de `preguntas_extra` en el JSON exportado, y agrégalos a `data/preguntas.json` siguiendo esta forma:

```json
{
  "numero": 184,
  "tema": "Derecho Disciplinario",
  "pregunta": "Texto de la pregunta…",
  "respuesta_correcta": "B. Texto de la opción correcta",
  "respuesta_usuario_correcta": true,
  "sustentacion_resumen": "Por qué es la respuesta correcta…",
  "normas_citadas": "Ley 1952/2019, art. …",
  "opciones": ["A. …", "B. …", "C. …"],
  "opcion_correcta_indice": 1
}
```

### Términos del glosario
Igual: botón **"＋ Agregar término"** en el Glosario, o directo en `data/glosario.json` con la forma `{ "id": N, "tema": "...", "termino": "...", "definicion": "..." }`.

### El cronograma
Vive en `data/cronograma.json`. Cada fase tiene una lista de `eventos`; cada evento es un día con `fecha` (ISO), `titulo`, `herramientas` (etiquetas: `glosario`, `tarjetas`, `quiz`, `diario`, `juego`, `simulacro`, `ficha`) y `claseEnVivo` (true si es una clase real del curso). Si el curso se reagenda, edita las fechas ahí.

## 6. Cómo se agrupan los temas

El PDF original del simulacro trae más de 140 sub-etiquetas muy finas (una por matiz de pregunta). `js/data.js` las agrupa automáticamente en las 19 áreas temáticas grandes que se usaron para diagnosticar y priorizar el plan de estudio (Función Pública, Constitución, MIPG, DIAN, etc.) — así el quiz, las tarjetas y las gráficas son usables. La sub-etiqueta original se conserva en el campo `subtema` de cada pregunta por si la necesitas.

## 7. Ideas para seguir mejorando (opcional)

- Agregar un service worker para que funcione offline.
- Conectar un backend real (p. ej. Supabase/Firebase) si en algún momento quieres tener el progreso sincronizado entre dispositivos sin exportar/importar a mano.
- Agregar más juegos o modos de repaso según lo que te vaya sirviendo.

---
Hecho a la medida para tu preparación al concurso de la Procuraduría. ¡Éxitos, Isabella!
