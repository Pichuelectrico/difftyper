import type { SessionState } from "./types";

export function elapsedMs(state: SessionState): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? Date.now();
  return end - state.startedAt;
}

export function wpm(correctChars: number, ms: number): number {
  if (ms < 1000) return 0;
  const val = correctChars / 5 / (ms / 60000);
  return Math.round(val * 10) / 10;
}

export function accuracy(state: SessionState): number {
  if (state.totalTyped === 0) return 100;
  return Math.round((state.totalCorrect / state.totalTyped) * 1000) / 10;
}

export function totalErrors(state: SessionState): number {
  let sum = state.activeErrors;
  for (const r of state.history) sum += r.errors;
  return sum;
}

export function summary(state: SessionState): {
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  errors: number;
  completed: number;
  total: number;
} {
  const ms = elapsedMs(state);
  return {
    wpm: wpm(state.totalCorrect, ms),
    accuracy: accuracy(state),
    elapsedMs: ms,
    errors: totalErrors(state),
    completed: state.history.length,
    total: state.targets.length,
  };
}
