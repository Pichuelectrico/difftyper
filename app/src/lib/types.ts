/**
 * Tipos compartidos del core de DiffTyper.
 * Este archivo es el CONTRATO entre el parser de diffs, el motor de tecleo,
 * el escáner de workspace y la UI. No modificar sin actualizar a los consumidores.
 */

/** Tipo de línea dentro de un hunk de diff unificado. */
export type DiffLineType = 'add' | 'del' | 'context';

export interface DiffLine {
  type: DiffLineType;
  /** Contenido sin el prefijo +/-/espacio y sin el salto de línea final. */
  content: string;
  /** Número de línea en el archivo nuevo (add/context), desde la cabecera del hunk. */
  newLineNo?: number;
  /** Número de línea en el archivo viejo (del), desde la cabecera del hunk. */
  oldLineNo?: number;
}

export interface DiffHunk {
  /** Cabecera original, p. ej. "@@ -1,5 +1,10 @@". */
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface ParsedFile {
  /** Ruta nueva (lado b/). */
  path: string;
  /** Ruta antigua (lado a/). Igual a `path` si no hay rename. */
  oldPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
}

export interface ParsedDiff {
  files: ParsedFile[];
}

/** Resultado de una línea de tecleo completada. */
export interface LineResult {
  /** Índice de la línea dentro de `targets`. */
  index: number;
  target: string;
  /** Texto final tecleado, incluyendo caracteres erróneos no corregidos. */
  typed: string;
  /** Pulsaciones erróneas cometidas durante esta línea. */
  errors: number;
}

/** Evento devuelto por el motor de tecleo tras cada pulsación. */
export type KeyEvent =
  | { type: 'char'; expected: boolean; ch: string }
  | { type: 'backspace' }
  | { type: 'line-complete'; lineIndex: number }
  | { type: 'enter-rejected' }
  | { type: 'skip'; lineIndex: number }
  | { type: 'finish' }
  | { type: 'ignored' };

/** Estado de una sesión de Trace & Type. */
export interface SessionState {
  /** Líneas objetivo ya normalizadas (sin líneas vacías). */
  targets: string[];
  /** Índice de la línea activa dentro de `targets`. */
  current: number;
  /** Buffer de la línea activa (incluye caracteres erróneos). Su longitud == pos del cursor. */
  typed: string;
  /** Líneas ya completadas, en orden. */
  history: LineResult[];
  /** Índices de líneas omitidas con Shift+Enter, en orden. */
  skipped: number[];
  /** Errores cometidos en la línea activa. */
  activeErrors: number;
  /** Pulsaciones imprimibles totales (correctas + erróneas). */
  totalTyped: number;
  /** Pulsaciones correctas totales. */
  totalCorrect: number;
  /** Epoch ms de la primera pulsación válida. */
  startedAt: number | null;
  /** Epoch ms del fin de sesión. */
  finishedAt: number | null;
  finished: boolean;
}
