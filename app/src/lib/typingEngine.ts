import type { SessionState, KeyEvent, LineResult, ParsedDiff } from "./types";

// Normaliza un target: tabs a 4 espacios, sin indentación inicial ni espacios finales.
// La indentación NO se teclea (en un IDE real se auto-indenta al dar Enter).
export function normalizeTarget(line: string): string {
  return line.replace(/\t/g, "    ").trim();
}

// Extrae la indentación inicial de una línea (tabs ya convertidos a 4 espacios).
// Se usa en el render para mostrar la indentación sin exigirla al teclear.
export function indentOf(line: string): string {
  return line.replace(/\t/g, "    ").match(/^\s*/)?.[0] ?? "";
}

export function createSession(targets: string[]): SessionState {
  return {
    targets,
    current: 0,
    typed: "",
    history: [],
    skipped: [],
    activeErrors: 0,
    totalTyped: 0,
    totalCorrect: 0,
    startedAt: null,
    finishedAt: null,
    finished: false,
  };
}

export function isLineComplete(state: SessionState): boolean {
  if (state.targets.length === 0) return false;
  if (state.current >= state.targets.length) return false;
  return state.typed.length === state.targets[state.current].length;
}

export function sessionProgress(state: SessionState): number {
  if (state.finished) return 100;
  if (state.targets.length === 0) return 0;
  return Math.round((state.history.length / state.targets.length) * 100);
}

export function handleKey(
  state: SessionState,
  key: string,
  shiftKey = false,
): { state: SessionState; event: KeyEvent } {
  // Carácter imprimible (incluye espacio)
  if (key.length === 1) {
    if (state.finished) return { state, event: { type: "ignored" } };
    const target = state.targets[state.current] ?? "";
    if (state.typed.length >= target.length) {
      return { state, event: { type: "ignored" } };
    }
    const expected = key === target[state.typed.length];
    const next: SessionState = {
      ...state,
      typed: state.typed + key,
      totalTyped: state.totalTyped + 1,
      totalCorrect: expected ? state.totalCorrect + 1 : state.totalCorrect,
      activeErrors: expected ? state.activeErrors : state.activeErrors + 1,
      startedAt: state.startedAt ?? Date.now(),
    };
    return {
      state: next,
      event: { type: "char", expected, ch: key },
    };
  }

  if (key === "Backspace") {
    if (state.typed.length > 0) {
      const next: SessionState = {
        ...state,
        typed: state.typed.slice(0, -1),
      };
      return { state: next, event: { type: "backspace" } };
    }
    return { state, event: { type: "ignored" } };
  }

  if (key === "Enter") {
    if (state.finished) return { state, event: { type: "ignored" } };
    // Shift+Enter → omitir línea
    if (shiftKey) {
      const lineIndex = state.current;
      const nextCurrent = state.current + 1;
      const isFinish = nextCurrent >= state.targets.length;
      const next: SessionState = {
        ...state,
        current: nextCurrent,
        typed: "",
        activeErrors: 0,
        skipped: [...state.skipped, lineIndex],
        finished: isFinish ? true : state.finished,
        finishedAt: isFinish ? Date.now() : state.finishedAt,
      };
      if (isFinish) {
        return { state: next, event: { type: "finish" } };
      }
      return { state: next, event: { type: "skip", lineIndex } };
    }
    const target = state.targets[state.current] ?? "";
    if (state.typed.length !== target.length) {
      return { state, event: { type: "enter-rejected" } };
    }
    const lineResult: LineResult = {
      index: state.current,
      target,
      typed: state.typed,
      errors: state.activeErrors,
    };
    const nextCurrent = state.current + 1;
    const isFinish = nextCurrent >= state.targets.length;
    if (isFinish) {
      const next: SessionState = {
        ...state,
        history: [...state.history, lineResult],
        current: nextCurrent,
        typed: "",
        activeErrors: 0,
        finished: true,
        finishedAt: Date.now(),
      };
      return { state: next, event: { type: "finish" } };
    }
    const next: SessionState = {
      ...state,
      history: [...state.history, lineResult],
      current: nextCurrent,
      typed: "",
      activeErrors: 0,
    };
    return { state: next, event: { type: "line-complete", lineIndex: state.current } };
  }

  return { state, event: { type: "ignored" } };
}

// Agrupa targets por archivo
export function targetsByFile(
  diff: ParsedDiff,
): { path: string; added: number; removed: number; targets: string[] }[] {
  return diff.files.map((f) => {
    let added = 0;
    let removed = 0;
    const targets: string[] = [];
    for (const h of f.hunks) {
      for (const l of h.lines) {
        if (l.type === "add") {
          added++;
          const t = normalizeTarget(l.content);
          if (t !== "") targets.push(t);
        } else if (l.type === "del") {
          removed++;
        }
      }
    }
    return { path: f.path || f.oldPath, added, removed, targets };
  });
}
