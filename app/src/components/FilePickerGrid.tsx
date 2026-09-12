interface Props {
  groups: { path: string; added: number; removed: number; targets: string[] }[];
  skipped: Set<string>;
  onPick: (path: string) => void;
  onToggleSkip: (path: string) => void;
  onPracticeAll: () => void;
}
export default function FilePickerGrid({ groups, skipped, onPick, onToggleSkip, onPracticeAll }: Props) {
  return (
    <div className="pick-section">
      <h2>Elige qué practicar</h2>
      <div className="pick-grid">
        {groups.filter((g) => g.targets.length > 0).map((g) => (
          <div key={g.path} className={`pick-card${skipped.has(g.path) ? " skipped" : ""}`}>
            <div className="pick-card-path">
              <span className="file-icon" aria-hidden="true">📄</span>
              <span>{g.path}</span>
            </div>
            <div className="pick-card-stats">
              <span className="stat-badge stat-add">+{g.added}</span>
              <span className="stat-badge stat-del">−{g.removed}</span>
            </div>
            <div className="pick-card-actions">
              <button type="button" className="btn btn-primary" onClick={() => onPick(g.path)}>Practicar</button>
              <button type="button" className="btn btn-secondary" onClick={() => onToggleSkip(g.path)}>
                {skipped.has(g.path) ? "Incluir" : "Omitir"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="pick-actions">
        <button type="button" className="btn btn-primary" onClick={onPracticeAll}>Practicar todo</button>
      </div>
    </div>
  );
}
