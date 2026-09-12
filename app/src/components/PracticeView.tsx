import { useEffect, useMemo, useRef, useState } from "react";
import type { ParsedDiff, DiffHunk } from "../lib/types";
import { normalizeTarget, indentOf, createSession, handleKey, sessionProgress, targetsByFile } from "../lib/typingEngine";
import { elapsedMs, wpm, accuracy, summary } from "../lib/stats";
import { getActiveEndpoint, analyzeLines } from "../lib/aiTutor";
import FilePickerGrid from "./FilePickerGrid";
import SessionSummary from "./SessionSummary";
import DiffLineRow from "./DiffLineRow";

interface Props {
  diff: ParsedDiff;
  sourceName: string;
  diffText: string;
  onExit: () => void;
}

interface RenderRow {
  type: "context" | "add" | "del" | "collapse";
  content: string;
  targetIndex: number | null;
  /** Número de línea real en el archivo nuevo (add/context); null si el parser no lo capturó. */
  lineNo?: number | null;
}

export default function PracticeView({ diff, sourceName, onExit }: Props) {
  const fileGroups = useMemo(() => targetsByFile(diff), [diff]);

  // pick state
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // determine if pick screen needed
  const multi = fileGroups.filter((g) => g.targets.length > 0).length > 1;
  const showPick = multi && activeFile === null;

  const handlePickFile = (path: string) => {
    setActiveFile(path);
  };
  const handlePickAll = () => {
    setActiveFile("__all__");
  };

  // derived targets/rows for current session
  const { targets, rows, currentFilePath } = useMemo(() => {
    let t: string[] = [];
    let r: { file: string; additions: number; deletions: number; rows: RenderRow[] }[] = [];
    let fp = "";

    // Aplana los hunks de un archivo a RenderRow[]: números de línea reales (new-file),
    // marcador "···" de salto entre hunks (líneas sin cambios omitidas) y targetIndex continuo.
    const flattenRows = (hunks: DiffHunk[], baseAdd: number): { rows: RenderRow[]; targets: string[]; addCount: number } => {
      const out: RenderRow[] = [];
      const tgts: string[] = [];
      let addIdx = baseAdd;
      let prevEnd: number | null = null; // última línea real (new-file) vista en hunks anteriores
      for (const hunk of hunks) {
        const firstNew = hunk.lines.find((l) => l.type !== "del" && l.newLineNo != null)?.newLineNo;
        if (firstNew != null && prevEnd != null && firstNew > prevEnd + 1) {
          const gap = firstNew - prevEnd - 1;
          out.push({ type: "collapse", content: `${gap} línea${gap === 1 ? "" : "s"} sin cambios`, targetIndex: null });
        }
        for (const line of hunk.lines) {
          if (line.type === "add") {
            const norm = normalizeTarget(line.content);
            if (norm !== "") {
              out.push({ type: "add", content: line.content, targetIndex: addIdx, lineNo: line.newLineNo ?? null });
              tgts.push(norm);
              addIdx += 1;
            } else {
              out.push({ type: "add", content: line.content, targetIndex: null, lineNo: line.newLineNo ?? null });
            }
            if (line.newLineNo != null) prevEnd = line.newLineNo;
          } else if (line.type === "del") {
            out.push({ type: "del", content: line.content, targetIndex: null });
          } else {
            out.push({ type: "context", content: line.content, targetIndex: null, lineNo: line.newLineNo ?? null });
            if (line.newLineNo != null) prevEnd = line.newLineNo;
          }
        }
      }
      return { rows: out, targets: tgts, addCount: addIdx };
    };

    if (activeFile === "__all__" || activeFile === null) {
      // todos los archivos combinados: los targets continúan entre archivos
      for (const file of diff.files) {
        const flat = flattenRows(file.hunks, t.length);
        t = [...t, ...flat.targets];
        r.push({ file: file.path, additions: file.additions, deletions: file.deletions, rows: flat.rows });
      }
      fp = fileGroups[0]?.path ?? "";
    } else {
      // single file: solo las filas de ese archivo
      const fg = fileGroups.find((g) => g.path === activeFile);
      fp = fg?.path ?? activeFile;
      const pf = diff.files.find((f) => (f.path || f.oldPath) === activeFile);
      if (pf) {
        const flat = flattenRows(pf.hunks, 0);
        t = flat.targets;
        r.push({ file: pf.path, additions: pf.additions, deletions: pf.deletions, rows: flat.rows });
      } else {
        t = fg?.targets ?? [];
      }
    }
    return { targets: t, rows: r, currentFilePath: fp };
  }, [diff, activeFile, fileGroups]);

  const [session, setSession] = useState(() => createSession(targets));
  // reset session when activeFile changes
  useEffect(() => {
    setSession(createSession(targets));
  }, [targets]);

  const [shake, setShake] = useState(false);
  const shakeRef = useRef<number | null>(null);
  useEffect(() => () => { if (shakeRef.current !== null) clearTimeout(shakeRef.current); }, []);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [lineTips, setLineTips] = useState<string[]>([]);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session.finished) surfaceRef.current?.focus();
  }, [session.finished]);

  // D19: los scrolls (vertical y horizontal) siguen la posición del cursor al teclear.
  // Se ejecuta tras cada render que cambia session (typed/lineIndex) — el cursor
  // salta abajo o a la derecha y el scroll lo trae de vuelta con margen de contexto.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const cursorEl = surface.querySelector<HTMLElement>(".diff-line .cursor");
    if (!cursorEl) return;
    const c = cursorEl.getBoundingClientRect();
    const s = surface.getBoundingClientRect();
    const pad = 32; // margen de contexto visible alrededor del cursor
    if (c.top < s.top + pad) {
      surface.scrollTop -= s.top + pad - c.top;
    } else if (c.bottom > s.bottom - pad) {
      surface.scrollTop += c.bottom - (s.bottom - pad);
    }
    if (c.left < s.left + pad) {
      surface.scrollLeft -= s.left + pad - c.left;
    } else if (c.right > s.right - pad) {
      surface.scrollLeft += c.right - (s.right - pad);
    }
  }, [session]);

  const fetchTips = async () => {
    const ep = getActiveEndpoint();
    if (!ep) {
      setTutorError("Configura un endpoint OpenAI-compatible en ⚙️ Configuración.");
      return;
    }
    setTutorLoading(true);
    setTutorError(null);
    try {
      const res = await analyzeLines(ep, currentFilePath, targets);
      setLineTips(res);
    } catch (e) {
      setTutorError(e instanceof Error ? e.message : String(e));
    } finally {
      setTutorLoading(false);
    }
  };

  const handleTutor = async () => {
    if (tutorOpen) {
      setTutorOpen(false);
      return;
    }
    setTutorOpen(true);
    setTutorError(null);
    // fetch if not already cached for this file
    if (lineTips.length !== targets.length) {
      await fetchTips();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") { onExit(); return; }
    if (e.key === "Tab") { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") {
      e.preventDefault();
      const { state: next, event } = handleKey(session, e.key, e.shiftKey);
      setSession(next);
      if (event.type === "enter-rejected") { setShake(true); if (shakeRef.current !== null) clearTimeout(shakeRef.current); shakeRef.current = window.setTimeout(() => setShake(false), 300); }
    }
  };

  if (showPick) {
    return <FilePickerGrid groups={fileGroups} skipped={skipped} onPick={handlePickFile} onToggleSkip={(p) => setSkipped((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; })} onPracticeAll={handlePickAll} />;
  }

  if (session.finished) {
    return <SessionSummary stats={summary(session)} onRepeat={() => setSession(createSession(targets))} onExit={onExit} />;
  }

  const activeEndpoint = getActiveEndpoint();

  return (
    <div className="practice-layout">
      <div className="practice-main">
      <div className="practice-toolbar">
        <div className="practice-toolbar-top">
          <span className="practice-source">{sourceName}</span>
          <button type="button" className="btn btn-secondary" onClick={handleTutor}>🤖 Tutor IA</button>
          <span className="practice-line-count" aria-live="polite">línea {session.current + 1}/{targets.length}</span>
        </div>
        <div className="progress"><div className="progress-fill" style={{ width: `${sessionProgress(session)}%` }} /></div>
        <div className="stats-row" aria-live="polite" role="status">
          <div className="stat-pill">
            <span className="stat-label">WPM</span>
            <span className="stat-value">{wpm(session.totalCorrect, elapsedMs(session))}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Precisión</span>
            <span className="stat-value">{accuracy(session)}%</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Tiempo</span>
            <span className="stat-value">{(elapsedMs(session) / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>
      <div ref={surfaceRef} tabIndex={0} autoFocus onKeyDown={onKeyDown} role="application" aria-label="Área de práctica de mecanografía" className={`practice-surface${shake ? " shake" : ""}`}>
        {rows.map((file, fi) => (
          <div key={fi}>
            <div className="file-subheader">
              <span>{file.file}</span>
              <span className="stat-badge stat-add">+{file.additions}</span>
              <span className="stat-badge stat-del">−{file.deletions}</span>
            </div>
            {(() => {
              let newLine = 0;
              return file.rows.map((row, ri) => {
                // Marcador de salto: filas sin cambios omitidas entre hunks
                if (row.type === "collapse") {
                  return (
                    <div key={ri} className="diff-line line-collapse">
                      <span className="gutter"></span>
                      <span>··· {row.content}</span>
                    </div>
                  );
                }
                // Gutter con números de línea reales (new-file); fallback secuencial si el parser no los capturó
                const renderable = row; // fila ya sin "collapse" (estrechado antes del IIFE)
                let gutter = "";
                if (row.type !== "del") {
                  if (row.lineNo != null) { gutter = String(row.lineNo); }
                  else { newLine++; gutter = String(newLine); }
                }
                const st = (() => {
                  if (row.type === "context") return "ctx" as const;
                  if (row.type === "del") return "del" as const;
                  if (row.targetIndex === null) return "done" as const;
                  if (session.skipped.includes(row.targetIndex)) return "skip" as const;
                  if (row.targetIndex < session.current) return "done" as const;
                  if (row.targetIndex > session.current) return "pending" as const;
                  return "active" as const;
                })();
                return <DiffLineRow key={ri} row={renderable} gutter={gutter} indent={row.type === "add" ? indentOf(row.content) : ""} target={row.targetIndex !== null ? targets[row.targetIndex] : undefined} typed={st === "active" ? session.typed : undefined} state={st} />;
              });
            })()}
          </div>
        ))}
      </div>
      <div className="hints-footer">Enter · siguiente línea · Shift+Enter · omitir línea · Backspace · corregir · Esc · salir · la indentación es automática (no se teclea)</div>
      </div>
      {tutorOpen && (
        <aside className="tutor-side">
          <div className="tutor-head">
            <div className="tutor-head-title">
              <span>🤖 Tutor IA</span>
              <span className="badge">{activeEndpoint?.name ?? "Sin endpoint"}</span>
            </div>
            <div className="tutor-head-actions">
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Recargar explicaciones del tutor" onClick={fetchTips}>🔄</button>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Cerrar tutor IA" onClick={() => setTutorOpen(false)}>✕</button>
            </div>
          </div>
          {tutorLoading && <p>Preparando explicaciones del tutor…</p>}
          {tutorError && <p className="tutor-error">{tutorError}</p>}
          {!tutorLoading && !tutorError && lineTips.length > 0 && (
            <>
              <p className="tutor-progress">Línea {session.current + 1} de {targets.length}</p>
              <p className="tutor-line">{lineTips[session.current] ?? ""}</p>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
