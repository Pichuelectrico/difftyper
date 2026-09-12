# DiffTyper

> **Eslogan:** Delega la generación a la IA, asimila la lógica con tus propias manos.

## Motivación

Mi motivación nace de algo que extraño de programar antes de la era de la IA: tipear código, entender cada línea y sentir que realmente estaba construyendo el proyecto.

Hoy la IA acelera muchísimo el desarrollo, pero también puede hacer que dejemos de comprender lo que ocurre detrás del código. Este proyecto busca llenar ese vacío: delegar la generación a la IA y asimilar la lógica con tus propias manos.

La aplicación convierte los cambios generados por la IA en un entorno interactivo donde puedes reescribirlos, entender cada línea y recibir explicaciones contextualizadas sobre qué hace y por qué existe. No se trata de competir con la IA, sino de reconectar con el código y validar que realmente entiendes lo que estás construyendo.

## ¿Qué es?

**DiffTyper** es un entorno interactivo de aprendizaje y práctica de código que transforma las diferencias de Git (`git diff`) en desafíos de mecanografía guiados por contexto. La plataforma permite a los desarrolladores asimilar activamente los cambios generados por agentes de IA o colaboradores, combinando la retroalimentación en tiempo real de aplicaciones de tecleo rápido con explicaciones semánticas línea por línea.

## ¿Cómo funciona?

1. **Captura del Diff:** Tu espacio de trabajo envía los cambios realizados en tus archivos mediante un endpoint o carga manual del archivo/diff.

2. **Análisis contextual por IA:** Un agente examina el archivo completo y los bloques modificados, generando anotaciones didácticas para cada nueva línea añadida o alterada.

3. **Modo Práctica Interactivo (Trace & Type):**
   - El código existente se muestra de fondo, mientras que las líneas que debes escribir aparecen atenuadas (fantasma/placeholder).
   - Al estilo de herramientas de typing rápido, los caracteres correctos se validan al instante y los errores se marcan en rojo, permitiendo correcciones inmediatas.
   - Al pulsar `Enter`, avanzas a la siguiente línea del diff.

4. **Tutor lateral dinámico:** Conforme tu cursor se posiciona en una línea, un panel lateral contextual detalla en lenguaje natural qué hace esa instrucción (por ejemplo: asignación de variables, llamadas a funciones o manejo de excepciones).

5. **Modo sin conexión / Práctica libre:** Si no se utiliza el endpoint conectado al agente, el sistema funciona como un gimnasio de mecanografía sobre el diff en bruto para practicar sintaxis y velocidad sin asistencia pedáctica.

## CLI: `difftyper`

El CLI es el puente entre tu repo git/GitHub y DiffTyper (Node puro, cero dependencias):

### Instalación
Requisito: **Node 18+** (`node --version`).

```bash
# Opción 1 — Instalar como comando global (recomendado)
cd DiffTyper && npm install -g .
difftyper init        # ya funciona desde cualquier repo
# (desinstalar: npm uninstall -g @difftyper/cli)

# Opción 2 — En desarrollo (symlink, se actualiza al editar el CLI)
cd cli && npm link

# Opción 3 — Sin instalar nada: ejecutar directo con node
node /ruta/a/DiffTyper/cli/index.js init
# ej. mac: node ~/Desktop/Proyect/DiffTyper/cli/index.js init
```

| Comando | Qué hace |
|---|---|
| `difftyper init` | Genera `.difftyper/changes.diff` desde `git diff HEAD` (tus cambios pendientes) y agrega `.difftyper/` al `.gitignore` del repo (lo crea si no existe) |
| `difftyper init <rango>` | Diff de un rango o commit, ej: `difftyper init origin/main..HEAD` (el diff de tu PR) o `difftyper init HEAD~2` |
| `difftyper init --github <url>` | Descarga el `.diff` de un PR o commit de GitHub, ej: `difftyper init --github https://github.com/user/repo/pull/123` |
| `difftyper update` | Igual que `init`, pero **sin tocar `.gitignore`** (actualiza solo el diff) |
| `difftyper help` | Muestra la ayuda |

Después de generarlo: abre el workspace en la webapp y pulsa **Re-escanear**.

## Tutor IA (OpenAI compatible)

DiffTyper incluye un **tutor de IA** que analiza los cambios del diff y los explica en lenguaje natural, vía endpoints OpenAI-compatibles:

1. Abre **⚙️ Configuración** en la app.
2. **Agrega** un endpoint: nombre, base URL (ej: `https://api.openai.com/v1`), API key y modelo.
3. Los endpoints se pueden **agregar, seleccionar, configurar y quitar**; el endpoint activo se usa para el análisis.
4. En modo práctica, pulsa **🤖 Tutor IA** y el tutor explicará los cambios del diff actual.

## Arranque rápido

```bash
# Instalar dependencias del monorepo
npm install

# Webapp (http://localhost:5173 — usa Chrome/Edge, la File System Access API no existe en Safari/Firefox)
npm run dev -w app

# O compilar la webapp para producción
npm run build -w app
```
