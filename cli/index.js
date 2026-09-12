#!/usr/bin/env node
const { spawnSync } = require('child_process');
const { mkdirSync, writeFileSync, existsSync, readFileSync } = require('fs');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function printHelp() {
  console.log('Uso: difftyper [init [rango]|init --github <url>|update|help]');
  console.log('');
  console.log('Comandos:');
  console.log('  init                Genera .difftyper/changes.diff desde git diff HEAD y agrega .difftyper/ a .gitignore');
  console.log('  init <rango>        Genera el diff desde un rango o commit (ej: origin/main..HEAD, HEAD~2)');
  console.log('  init --github <url> Descarga el diff desde una URL de PR o commit de GitHub');
  console.log('  update              Igual que init (actualiza el diff existente)');
  console.log('  help                Muestra esta ayuda');
  console.log('');
  console.log('Ejemplos:');
  console.log('  difftyper init origin/main..HEAD');
  console.log('  difftyper init HEAD~2');
  console.log('  difftyper init --github https://github.com/user/repo/pull/123');
}

// D20: asegura que .difftyper/ esté en el .gitignore del proyecto objetivo.
// Si no existe .gitignore lo crea; si existe y no tiene la entrada, la agrega al final.
function ensureGitignoreEntry() {
  const gitignorePath = '.gitignore';
  try {
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      const yaEsta = content.split(/\r?\n/).some((l) => l.trim() === '.difftyper/' || l.trim() === '.difftyper');
      if (yaEsta) return;
      let next = content;
      if (!next.endsWith('\n')) next += '\n';
      next += '\n# Estado local de DiffTyper\n.difftyper/\n';
      writeFileSync(gitignorePath, next);
      console.log(`${GREEN}✔ .difftyper/ agregado a .gitignore${RESET}`);
    } else {
      writeFileSync(gitignorePath, '# Estado local de DiffTyper\n.difftyper/\n');
      console.log(`${GREEN}✔ .gitignore creado con .difftyper/${RESET}`);
    }
  } catch {
    console.log(`${YELLOW}⚠ No se pudo actualizar .gitignore (continúa sin cambios)${RESET}`);
  }
}

function saveDiff(diff) {
  const existed = existsSync('.difftyper');
  if (!diff.trim()) {
    console.log(`${YELLOW}⚠ El diff está vacío. Nada que practicar.${RESET}`);
    process.exit(0);
  }
  mkdirSync('.difftyper', { recursive: true });
  writeFileSync('.difftyper/changes.diff', diff);
  const lines = diff.split('\n');
  let archivos = 0, hunks = 0, a = 0, d = 0;
  for (const line of lines) {
    if (line.startsWith('diff --git ')) archivos++;
    if (line.startsWith('@@ -')) hunks++;
    if (line.startsWith('+') && !line.startsWith('+++')) a++;
    if (line.startsWith('-') && !line.startsWith('---')) d++;
  }
  const accion = existed && existsSync('.difftyper/changes.diff') ? 'actualizado' : 'creado';
  console.log(`${GREEN}✔ DiffTyper activo: .difftyper/changes.diff (${archivos} archivos, ${hunks} hunks, +${a}/−${d} líneas) (${accion})${RESET}`);
  console.log(`${CYAN}→ Abre DiffTyper, abre este workspace y pulsa Re-escanear.${RESET}`);
}

function runInit(args, isInit) {
  // Modo --github
  const githubIdx = args.indexOf('--github');
  if (githubIdx !== -1) {
    const url = args[githubIdx + 1];
    if (!url) {
      console.error(`${RED}✖ Falta la URL después de --github. Uso: difftyper init --github <url>${RESET}`);
      process.exit(1);
    }
    // Validar URL de GitHub
    let parsed;
    try { parsed = new URL(url); } catch {
      console.error(`${RED}✖ URL inválida: ${url}${RESET}`);
      process.exit(1);
    }
    if (parsed.hostname !== 'github.com') {
      console.error(`${RED}✖ URL inválida: debe ser una URL de github.com${RESET}`);
      process.exit(1);
    }
    if (!url.includes('/pull/') && !url.includes('/commit/')) {
      console.error(`${RED}✖ URL inválida: debe ser un PR (/pull/) o commit (/commit/) de GitHub${RESET}`);
      process.exit(1);
    }
    // Determinar URL de descarga
    let fetchUrl;
    if (url.endsWith('.diff') || url.endsWith('.patch')) {
      fetchUrl = url;
    } else {
      fetchUrl = url.replace(/\/$/, '') + '.diff';
    }
    fetch(fetchUrl).then(async (res) => {
      if (res.status === 404) {
        console.error(`${RED}✖ No se encontró el PR/commit: ${url}${RESET}`);
        process.exit(1);
      }
      if (!res.ok) {
        console.error(`${RED}✖ Error al descargar el diff (HTTP ${res.status})${RESET}`);
        process.exit(1);
      }
      const text = await res.text();
      if (!text.trim()) {
        console.log(`${YELLOW}⚠ El diff descargado está vacío. Nada que practicar.${RESET}`);
        process.exit(0);
      }
      saveDiff(text);
      if (isInit) ensureGitignoreEntry();
    }).catch((err) => {
      console.error(`${RED}✖ Error de red al descargar el diff: ${err.message}${RESET}`);
      process.exit(1);
    });
    return;
  }

  // Modo rango/commit
  const positional = args.filter((a) => !a.startsWith('-'));
  if (positional.length > 1) {
    console.error(`${RED}✖ Demasiados argumentos. Uso: difftyper init [rango]${RESET}`);
    printHelp();
    process.exit(1);
  }
  const range = positional[0] || 'HEAD';

  const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree']);
  if (gitCheck.error || gitCheck.stdout.toString().trim() !== 'true') {
    console.error(`${RED}✖ No estás dentro de un repositorio git. Ejecuta primero: git init${RESET}`);
    process.exit(1);
  }

  const result = spawnSync('git', ['diff', range], { maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) {
    const err = result.stderr ? result.stderr.toString().trim() : 'error desconocido';
    console.error(`${RED}✖ Error al ejecutar git diff ${range}: ${err}${RESET}`);
    process.exit(1);
  }

  let diff = result.stdout.toString();

  // D5: añadir untracked files (solo en flujo normal, no con rango explícito distinto de HEAD si se quiere incluir igual)
  // Se incluye siempre que no sea --github (ya retornado arriba)
  try {
    const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { maxBuffer: 5 * 1024 * 1024 });
    const files = untracked.stdout ? untracked.stdout.toString().split('\n').filter(Boolean) : [];
    const { execSync } = require('child_process');
    for (const f of files) {
      try {
        const extra = execSync(`git diff --no-index -- /dev/null "${f.replace(/"/g, '\\"')}"`, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf-8' });
        if (extra) diff += (diff.endsWith('\n') ? '' : '\n') + extra;
      } catch (e) {
        // git diff --no-index sale con 1 cuando hay diff; capturar stdout
        const out = e.stdout ? e.stdout.toString() : '';
        if (out) diff += (diff.endsWith('\n') ? '' : '\n') + out;
      }
    }
  } catch {
    // ignorar errores de untracked
  }

  if (!diff.trim()) {
    console.log(`${YELLOW}⚠ No hay cambios sin commitear (git diff ${range} está vacío). Nada que practicar.${RESET}`);
    process.exit(0);
  }
  saveDiff(diff);
  if (isInit) ensureGitignoreEntry();
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    runInit([]);
    return;
  }
  const cmd = rawArgs[0];
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }
  if (cmd === 'init' || cmd === 'update') {
    // isInit: solo init gestiona .gitignore (.difftyper/); update no toca .gitignore
    runInit(rawArgs.slice(1), cmd === 'init');
    return;
  }
  printHelp();
}

main();
