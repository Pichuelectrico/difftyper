import type { ParsedDiff, ParsedFile, DiffHunk } from "./types";

// Parsea un diff unificado git-style de forma tolerante. Nunca lanza.
export function parseDiff(text: string): ParsedDiff {
  try {
    if (!text || text.trim() === "") return { files: [] };

    // Normalizar saltos de línea
    const normalized = text.replace(/\r\n/g, "\n");
    let lines = normalized.split("\n");
    // Descartar última si es string vacío final
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines = lines.slice(0, -1);
    }

    const files: ParsedFile[] = [];
    let currentFile: ParsedFile | null = null;
    let currentHunk: DiffHunk | null = null;

    // Regex asume rutas sin espacios
    const diffGitRegex = /^diff --git a\/(\S+) b\/(\S+)/;
    const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

    function pushHunk(): void {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      currentHunk = null;
    }

    function pushFile(): void {
      pushHunk();
      if (currentFile) files.push(currentFile);
      currentFile = null;
    }

    // Detectar si hay diff --git en algún lado
    const hasDiffGit = lines.some((l) => diffGitRegex.test(l));
    // Si no hay diff --git pero hay --- inicial, tratar como single file
    // Lo manejamos creando un file implícito

    // Números de línea reales por hunk (new-file y old-file); se resetean en cada cabecera @@
    let newLineNo = 0;
    let oldLineNo = 0;

    for (const raw of lines) {
      const diffMatch = raw.match(diffGitRegex);
      if (diffMatch) {
        pushFile();
        const oldP = diffMatch[1];
        const newP = diffMatch[2];
        currentFile = {
          path: newP,
          oldPath: oldP,
          hunks: [],
          additions: 0,
          deletions: 0,
          isBinary: false,
          isNew: false,
          isDeleted: false,
          isRename: false,
        };
        continue;
      }

      // Metadatos solo si hay archivo actual
      if (raw.startsWith("new file mode")) {
        if (currentFile) currentFile.isNew = true;
        continue;
      }
      if (raw.startsWith("deleted file mode")) {
        if (currentFile) currentFile.isDeleted = true;
        continue;
      }
      if (raw.startsWith("rename from ")) {
        if (currentFile) {
          currentFile.isRename = true;
          // quitar prefijo a/ si existe
          const v = raw.slice("rename from ".length);
          currentFile.oldPath = v.startsWith("a/") ? v.slice(2) : v;
        }
        continue;
      }
      if (raw.startsWith("rename to ")) {
        if (currentFile) {
          currentFile.isRename = true;
          const v = raw.slice("rename to ".length);
          currentFile.path = v.startsWith("b/") ? v.slice(2) : v;
        }
        continue;
      }
      if (raw.startsWith("Binary files ") && raw.includes(" differ")) {
        if (currentFile) currentFile.isBinary = true;
        continue;
      }
      if (raw.startsWith("index ") || raw.startsWith("similarity index ")) {
        continue;
      }

      if (raw.startsWith("--- ")) {
        const p = raw.slice(4).trim().split("\t")[0];
        if (p === "/dev/null") continue;
        // Si no hay archivo aún (single file diff), crear uno
        if (!currentFile && !hasDiffGit) {
          const clean = p.startsWith("a/") ? p.slice(2) : p;
          currentFile = {
            path: clean,
            oldPath: clean,
            hunks: [],
            additions: 0,
            deletions: 0,
            isBinary: false,
            isNew: false,
            isDeleted: false,
            isRename: false,
          };
        }
        if (currentFile) {
          const clean = p.startsWith("a/") ? p.slice(2) : p;
          currentFile.oldPath = clean;
        }
        continue;
      }
      if (raw.startsWith("+++ ")) {
        const p = raw.slice(4).trim().split("\t")[0];
        if (p === "/dev/null") continue;
        if (!currentFile && !hasDiffGit) {
          const clean = p.startsWith("b/") ? p.slice(2) : p;
          currentFile = {
            path: clean,
            oldPath: clean,
            hunks: [],
            additions: 0,
            deletions: 0,
            isBinary: false,
            isNew: false,
            isDeleted: false,
            isRename: false,
          };
        }
        if (currentFile) {
          const clean = p.startsWith("b/") ? p.slice(2) : p;
          currentFile.path = clean;
        }
        continue;
      }

      const hunkMatch = raw.match(hunkRegex);
      if (hunkMatch) {
        // Si no hay archivo pero hay hunk (caso single file sin diff --git)
        if (!currentFile) {
          currentFile = {
            path: "",
            oldPath: "",
            hunks: [],
            additions: 0,
            deletions: 0,
            isBinary: false,
            isNew: false,
            isDeleted: false,
            isRename: false,
          };
        }
        pushHunk();
        currentHunk = {
          header: raw,
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1,
          newStart: parseInt(hunkMatch[3], 10),
          newLines: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1,
          lines: [],
        };
        newLineNo = currentHunk.newStart;
        oldLineNo = currentHunk.oldStart;
        continue;
      }

      if (raw.startsWith("\\")) {
        // "\ No newline at end of file" — ignorar
        continue;
      }

      if (currentHunk && currentFile) {
        if (raw.startsWith(" ")) {
          currentHunk.lines.push({ type: "context", content: raw.slice(1), newLineNo, oldLineNo });
          newLineNo += 1;
          oldLineNo += 1;
        } else if (raw.startsWith("+")) {
          currentHunk.lines.push({ type: "add", content: raw.slice(1), newLineNo });
          newLineNo += 1;
          currentFile.additions += 1;
        } else if (raw.startsWith("-")) {
          currentHunk.lines.push({ type: "del", content: raw.slice(1), oldLineNo });
          oldLineNo += 1;
          currentFile.deletions += 1;
        }
      }
    }

    pushFile();
    return { files };
  } catch {
    return { files: [] };
  }
}
