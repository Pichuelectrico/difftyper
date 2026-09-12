import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CLI_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: "difftyper init", desc: "Captura tus cambios pendientes (git diff HEAD)." },
  { cmd: "difftyper init <rango>", desc: "Diff de tu PR, ej. origin/main..HEAD." },
  { cmd: "difftyper init --github <url>", desc: "Descarga el .diff de un PR o commit de GitHub." },
  { cmd: "difftyper update", desc: "Actualiza el diff existente." },
  { cmd: "difftyper help", desc: "Muestra la ayuda del CLI." },
];

export default function HowToUse({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <div className="settings-header-text">
            <h2 id="help-title">Cómo usar DiffTyper</h2>
            <p className="settings-subtitle">CLI + flujo en la webapp</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Cerrar ayuda" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="settings-body help-modal-body">
          <section className="help-section">
            <p className="settings-section-title">Instalación</p>
            <p className="hint">Requisito: Node 18 o superior. Comprueba con:</p>
            <div className="help-cmd-list">
              <div className="help-cmd">
                <div className="terminal-block help-cmd-terminal">
                  <span className="terminal-badge">CLI</span>
                  <pre>node --version</pre>
                </div>
              </div>

              <div className="help-cmd">
                <p className="help-cmd-desc">Opción 1 — Instalar como comando global (recomendado)</p>
                <div className="terminal-block help-cmd-terminal">
                  <span className="terminal-badge">CLI</span>
                  <pre>cd DiffTyper && npm install -g .</pre>
                </div>
                <p className="help-cmd-desc">Después <code>difftyper init</code> funciona desde cualquier repo.</p>
                <p className="hint">Desinstalar: <code>npm uninstall -g @difftyper/cli</code></p>
              </div>

              <div className="help-cmd">
                <p className="help-cmd-desc">Opción 2 — En desarrollo (sin instalar de verdad)</p>
                <div className="terminal-block help-cmd-terminal">
                  <span className="terminal-badge">CLI</span>
                  <pre>cd cli && npm link</pre>
                </div>
                <p className="hint">Symlink; se actualiza solo al editar el CLI.</p>
              </div>

              <div className="help-cmd">
                <p className="help-cmd-desc">Opción 3 — Sin instalar nada</p>
                <div className="terminal-block help-cmd-terminal">
                  <span className="terminal-badge">CLI</span>
                  <pre>node /ruta/a/DiffTyper/cli/index.js init</pre>
                </div>
                <p className="hint">Ejemplo mac:</p>
                <div className="terminal-block help-cmd-terminal">
                  <span className="terminal-badge">CLI</span>
                  <pre>node ~/Desktop/Proyect/DiffTyper/cli/index.js init</pre>
                </div>
              </div>
            </div>
          </section>
          <section className="help-section">
            <p className="settings-section-title">CLI</p>
            <div className="help-cmd-list">
              {CLI_COMMANDS.map((item) => (
                <div key={item.cmd} className="help-cmd">
                  <div className="terminal-block help-cmd-terminal">
                    <span className="terminal-badge">CLI</span>
                    <pre>{item.cmd}</pre>
                  </div>
                  <p className="help-cmd-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="help-section">
            <p className="settings-section-title">Flujo web</p>
            <ol className="help-steps">
              <li>Abre tu workspace</li>
              <li>Re-escanear</li>
              <li>Elige archivo y practica</li>
              <li>🤖 Tutor IA (configura tu endpoint en ⚙️ Configuración)</li>
            </ol>
            <p className="hint help-note">Los diffs viven en <code>.difftyper/changes.diff</code>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
