import type { DiffFileEntry } from "../lib/workspace";

interface Props {
  workspaceName: string;
  entries: DiffFileEntry[];
  busy: boolean;
  onOpen: (entry: DiffFileEntry) => void;
  onRescan: () => void;
  onChangeWorkspace: () => void;
}

export default function DiffList({ workspaceName, entries, busy, onOpen, onRescan, onChangeWorkspace }: Props) {
  return (
    <div>
      <div className="list-header">
        <div>
          <h2>Diffs en {workspaceName}</h2>
          <p className="list-count">{entries.length} archivo(s)</p>
        </div>
        <div className="list-toolbar">
          <button type="button" className="btn btn-primary" onClick={onRescan} disabled={busy}>
            Re-escanear
          </button>
          <button type="button" className="btn btn-secondary" onClick={onChangeWorkspace}>
            Cambiar workspace
          </button>
        </div>
      </div>
      {entries.map((e) => (
        <div
          key={e.path}
          className="card"
          onClick={() => onOpen(e)}
          role="button"
          tabIndex={0}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              onOpen(e);
            }
          }}
        >
          <div className="card-title">
            <span className="file-icon" aria-hidden="true">📄</span>
            <span>{e.name}</span>
          </div>
          <span className="card-path">{e.path}</span>
          <div className="card-meta">
            <span className="badge">{(e.size / 1024).toFixed(1)} KB</span>
            {e.fromDifftyper && <span className="badge">difftyper</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
