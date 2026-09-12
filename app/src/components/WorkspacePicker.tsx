import { useRef } from "react";

interface Props {
  supported: boolean;
  busy: boolean;
  onOpenWorkspace: () => void;
  onOpenFiles: (files: FileList) => void;
}

export default function WorkspacePicker({ supported, busy, onOpenWorkspace, onOpenFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="workspace-picker">
      <div className="empty-icon" aria-hidden="true">⌨️</div>
      <h1>DiffTyper</h1>
      <p>Transforma tus git diff en desafíos de mecanografía.</p>
      <div className="empty-actions">
        <button type="button" className="btn btn-primary" onClick={onOpenWorkspace} disabled={busy || !supported}>
          Abrir workspace
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          Abrir archivo .diff…
        </button>
      </div>
      {!supported && (
        <p className="hint">Tu navegador no soporta File System Access API. Usa Chrome o Edge, o abre un .diff suelto:</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".diff,.patch"
        hidden aria-hidden="true" tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) onOpenFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="hint">
        Funciona con cualquier carpeta que contenga archivos .diff/.patch (p. ej. .difftyper/changes.diff generado con
        difftyper init).
      </p>
    </div>
  );
}
