import React from "react";
interface Row { type: "context" | "add" | "del" | "collapse"; content: string; targetIndex: number | null; }
interface Props { row: Row; gutter: string; indent?: string; target?: string; typed?: string; skipped?: boolean; state: "ctx"|"del"|"done"|"pending"|"skip"|"active"; }
function DiffLineRow({ row, gutter, indent = "", target, typed, skipped: _skipped, state }: Props) {
  if (state === "ctx") return <div className="diff-line ln-ctx"><span className="gutter">{gutter}</span><span>{row.content}</span></div>;
  if (state === "del") return <div className="diff-line ln-del"><span className="gutter"></span><span>{row.content}</span></div>;
  if (state === "done" || state === "pending" || state === "skip") {
    const cls = state === "skip" ? "add-skip" : state === "done" ? "add-done" : "add-pending";
    return <div className={`diff-line ${cls}`}><span className="gutter">{gutter}</span><span>{indent}{target ?? row.content}</span></div>;
  }
  // active: la indentación se muestra neutra (no se teclea); el cursor arranca en la primera letra
  const t = target ?? "";
  const ty = typed ?? "";
  return (
    <div className="diff-line">
      <span className="gutter">{gutter}</span>
      <span>
        {indent && <span className="ch-indent">{indent}</span>}
        {t.split("").map((ch, i) => {
          if (i < ty.length) return <span key={i} className={ty[i] === ch ? "ch-ok" : "ch-bad"}>{ch}</span>;
          if (i === ty.length) return <span key={i}><span className="cursor"> </span><span className="ch-ghost">{t.slice(i)}</span></span>;
          return null;
        })}
        {ty.length >= t.length && <span className="cursor"> </span>}
      </span>
    </div>
  );
}
export default React.memo(DiffLineRow);
