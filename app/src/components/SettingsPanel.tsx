import { useState, useEffect, useRef } from "react";
import {
  loadEndpoints,
  saveEndpoints,
  loadActiveEndpointId,
  saveActiveEndpointId,
  makeEndpointId,
  normalizeBaseUrl,
  type TutorEndpoint,
} from "../lib/aiTutor";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** true si la URL es http:// y el host no es localhost/127.0.0.1 */
function needsHttpWarning(baseUrl: string): boolean {
  const t = baseUrl.trim().toLowerCase();
  if (!t.startsWith("http://")) return false;
  try {
    const u = new URL(t);
    return u.hostname !== "localhost" && u.hostname !== "127.0.0.1";
  } catch {
    return !t.includes("localhost") && !t.includes("127.0.0.1");
  }
}

export default function SettingsPanel({ open, onClose }: Props) {
  const [endpoints, setEndpoints] = useState<TutorEndpoint[]>(() => loadEndpoints());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveEndpointId());
  const [form, setForm] = useState({ name: "", baseUrl: "", apiKey: "", model: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setEndpoints(loadEndpoints());
    setActiveId(loadActiveEndpointId());
    firstInputRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    setSavedError(null);
    const existing = editId ? endpoints.find((e) => e.id === editId) : undefined;
    const apiKey = form.apiKey;
    const ep: TutorEndpoint = {
      id: editId ?? makeEndpointId(),
      name: form.name,
      baseUrl: normalizeBaseUrl(form.baseUrl),
      apiKey,
      model: form.model,
      // Si se edita y la clave queda vacía, conservar la existente vía hasKey
      hasKey: apiKey.trim() !== "" ? true : Boolean(existing?.hasKey),
    };
    let next: TutorEndpoint[];
    if (editId) {
      next = endpoints.map((e) => (e.id === editId ? ep : e));
    } else {
      next = [...endpoints, ep];
    }
    try {
      await saveEndpoints(next);
      setEndpoints(loadEndpoints());
      // seleccionar el guardado
      saveActiveEndpointId(ep.id);
      setActiveId(ep.id);
      setEditId(null);
      setForm({ name: "", baseUrl: "", apiKey: "", model: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSavedError("No se pudo cifrar o guardar la API key. Inténtalo de nuevo.");
    }
  };

  const handleSelect = (id: string) => {
    saveActiveEndpointId(id);
    setActiveId(id);
  };

  const handleEdit = (ep: TutorEndpoint) => {
    setEditId(ep.id);
    // Campo apiKey vacío: conservar clave si el usuario no escribe nada
    setForm({ name: ep.name, baseUrl: ep.baseUrl, apiKey: "", model: ep.model });
    setSavedError(null);
  };

  const handleRemove = async (id: string) => {
    const next = endpoints.filter((e) => e.id !== id);
    try {
      await saveEndpoints(next);
      setEndpoints(loadEndpoints());
      if (activeId === id) {
        saveActiveEndpointId(null);
        setActiveId(null);
      }
      if (editId === id) {
        setEditId(null);
        setForm({ name: "", baseUrl: "", apiKey: "", model: "" });
      }
      setSavedError(null);
    } catch {
      setSavedError("No se pudo actualizar la lista de endpoints. Inténtalo de nuevo.");
    }
  };

  const handleCancel = () => {
    if (editId) {
      setEditId(null);
      setForm({ name: "", baseUrl: "", apiKey: "", model: "" });
      setSavedError(null);
      return;
    }
    onClose();
  };

  function EndpointList({ endpoints: eps, activeId: aid, onSelect, onEdit, onRemove }: { endpoints: TutorEndpoint[]; activeId: string | null; onSelect: (id: string) => void; onEdit: (ep: TutorEndpoint) => void; onRemove: (id: string) => void; }) {
    if (eps.length === 0) {
      return <p className="settings-empty">Aún no hay endpoints. Agrega uno abajo para el tutor IA.</p>;
    }
    return (
      <div className="settings-list">
        <p className="settings-section-title">Endpoints</p>
        {eps.map((ep) => (
          <div key={ep.id} className={`settings-row${aid === ep.id ? " is-active" : ""}`}>
            <div className="settings-row-info">
              <span className="settings-row-name">{ep.name}</span>
              <span className="settings-row-meta">
                {ep.baseUrl} · {ep.model} · {ep.hasKey ? "🔑 configurada" : "sin clave"}
              </span>
            </div>
            <div className="settings-row-actions">
              <button type="button" className="btn btn-secondary" onClick={() => onSelect(ep.id)}>Usar</button>
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(ep)}>Configurar</button>
              <button type="button" className="btn btn-danger" onClick={() => onRemove(ep.id)}>Quitar</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function EndpointForm({ form: f, onChange, editId: eid }: { form: { name: string; baseUrl: string; apiKey: string; model: string }; onChange: (k: string, v: string) => void; editId: string | null; }) {
    const showHttpWarn = needsHttpWarning(f.baseUrl);
    return (
      <div className="settings-form">
        <p className="settings-section-title">{eid ? "Editar endpoint" : "Nuevo endpoint"}</p>
        <fieldset className="settings-fieldset">
          <p className="settings-fieldset-title">Identidad</p>
          <div className="settings-field">
            <label htmlFor="settings-name">Nombre</label>
            <input
              id="settings-name"
              ref={firstInputRef}
              className="settings-input"
              value={f.name}
              placeholder="p. ej. OpenAI local"
              onChange={(e) => onChange("name", e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label htmlFor="settings-base">Base URL</label>
            <input
              id="settings-base"
              className="settings-input"
              value={f.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => onChange("baseUrl", e.target.value)}
            />
            {showHttpWarn && (
              <p className="hint hint-warn" role="status">
                ⚠ El endpoint no es HTTPS: la API key viajaría sin cifrar por la red. Usa HTTPS o localhost.
              </p>
            )}
          </div>
        </fieldset>
        <fieldset className="settings-fieldset">
          <p className="settings-fieldset-title">Conexión</p>
          <div className="settings-grid-2">
            <div className="settings-field">
              <label htmlFor="settings-key">API Key</label>
              <input
                id="settings-key"
                className="settings-input"
                type="password"
                value={f.apiKey}
                placeholder={eid ? "dejar igual para conservar la clave actual" : "sk-…"}
                onChange={(e) => onChange("apiKey", e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="settings-field">
              <label htmlFor="settings-model">Modelo</label>
              <input
                id="settings-model"
                className="settings-input"
                value={f.model}
                placeholder="gpt-4o-mini"
                onChange={(e) => onChange("model", e.target.value)}
              />
            </div>
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-header-text">
            <h2 id="settings-title">⚙️ Configuración</h2>
            <p className="settings-subtitle">Endpoints OpenAI-compatibles para el tutor IA</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Cerrar configuración" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <section className="settings-disclaimer">
            <p className="settings-section-title">🔐 Privacidad y seguridad</p>
            <p className="hint">
              Tus API keys se cifran (AES-GCM) y se guardan SOLO en tu navegador. DiffTyper no tiene servidor: no recibe, no procesa y no conserva ningún dato tuyo. Las solicitudes van únicamente al endpoint que tú configures, con cabeceras seguras (sin referrer, sin credenciales, sin caché).
            </p>
          </section>
          <EndpointList endpoints={endpoints} activeId={activeId} onSelect={handleSelect} onEdit={handleEdit} onRemove={handleRemove} />
          <EndpointForm form={form} onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))} editId={editId} />
        </div>
        <div className="settings-footer">
          {saved && <span className="settings-saved" aria-live="polite">Guardado ✓</span>}
          {savedError && <span className="settings-error" aria-live="assertive">{savedError}</span>}
          <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()}>{editId ? "Guardar" : "Agregar"}</button>
        </div>
      </div>
    </div>
  );
}
