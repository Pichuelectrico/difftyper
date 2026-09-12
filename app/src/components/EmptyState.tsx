interface Props {
  workspaceName: string;
  busy: boolean;
  onRescan: () => void;
  onChangeWorkspace: () => void;
}

export default function EmptyState({ workspaceName, busy, onRescan, onChangeWorkspace }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">📭</div>
      <h2>Sin diffs todavía</h2>
      <p>No se encontraron archivos .diff/.patch en &quot;{workspaceName}&quot;.</p>
      <div className="terminal-block">
        <span className="terminal-badge">CLI</span>
        <pre>{`# Captura tus cambios pendientes (git diff HEAD):
difftyper init

# El diff de tu PR:
difftyper init origin/main..HEAD

# Descarga el diff de GitHub:
difftyper init --github https://github.com/user/repo/pull/123`}</pre>
      </div>
      <p className="hint">Luego pulsa Re-escanear aquí para verlo.</p>
      <div className="empty-actions">
        <button type="button" className="btn btn-primary" onClick={onRescan} disabled={busy}>
          Re-escanear
        </button>
        <button type="button" className="btn btn-secondary" onClick={onChangeWorkspace}>
          Cambiar workspace
        </button>
      </div>
    </div>
  );
}
