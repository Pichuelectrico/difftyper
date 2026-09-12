interface Props {
  stats: { wpm: number; accuracy: number; elapsedMs: number; errors: number; completed: number; total: number };
  onRepeat: () => void;
  onExit: () => void;
}
export default function SessionSummary({ stats, onRepeat, onExit }: Props) {
  return (
    <div className="summary">
      <h2>¡Sesión completada! 🎉</h2>
      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-stat-value">{stats.wpm}</span>
          <span className="summary-stat-label">WPM</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{stats.accuracy}%</span>
          <span className="summary-stat-label">Precisión</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{(stats.elapsedMs / 1000).toFixed(1)}s</span>
          <span className="summary-stat-label">Tiempo</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{stats.errors}</span>
          <span className="summary-stat-label">Errores</span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-value">{stats.completed}/{stats.total}</span>
          <span className="summary-stat-label">Completadas</span>
        </div>
      </div>
      <div className="summary-actions">
        <button type="button" className="btn btn-primary" onClick={onRepeat}>Repetir</button>
        <button type="button" className="btn btn-secondary" onClick={onExit}>Volver a la lista</button>
      </div>
    </div>
  );
}
