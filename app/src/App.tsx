import { useState } from "react";
import WorkspacePicker from "./components/WorkspacePicker";
import EmptyState from "./components/EmptyState";
import DiffList from "./components/DiffList";
import PracticeView from "./components/PracticeView";
import { parseDiff } from "./lib/diffParser";
import { isFileSystemAccessSupported, pickWorkspace, scanForDiffs, readDiffText, type DiffFileEntry } from "./lib/workspace";
import type { ParsedDiff } from "./lib/types";
import SettingsPanel from "./components/SettingsPanel";
import HowToUse from "./components/HowToUse";
import Footer, { GitHubIcon } from "./components/Footer";

export default function App() {
  const [screen, setScreen] = useState<"landing" | "empty" | "list" | "practice">("landing");
  const [workspace, setWorkspace] = useState<FileSystemDirectoryHandle | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [entries, setEntries] = useState<DiffFileEntry[]>([]);
  const [practice, setPractice] = useState<{ diff: ParsedDiff; sourceName: string; diffText: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const browserSupported = isFileSystemAccessSupported();

  const handleOpenWorkspace = async () => {
    setBusy(true);
    try {
      const dir = await pickWorkspace();
      if (!dir) return;
      const found = await scanForDiffs(dir);
      setWorkspace(dir);
      setWorkspaceName(dir.name);
      setEntries(found);
      setScreen(found.length === 0 ? "empty" : "list");
    } finally {
      setBusy(false);
    }
  };

  const handleRescan = async () => {
    if (!workspace) return;
    setBusy(true);
    try {
      const found = await scanForDiffs(workspace);
      setEntries(found);
      setScreen(found.length === 0 ? "empty" : "list");
    } finally {
      setBusy(false);
    }
  };

  const handleChangeWorkspace = () => {
    setWorkspace(null);
    setWorkspaceName("");
    setEntries([]);
    setPractice(null);
    setScreen("landing");
  };

  const handleOpenEntry = async (entry: DiffFileEntry) => {
    setBusy(true);
    try {
      const text = await readDiffText(entry.handle);
      const diff = parseDiff(text);
      if (diff.files.length === 0) {
        setStatus("El diff no contiene archivos válidos");
        return;
      }
      setPractice({ diff, sourceName: entry.name, diffText: text });
      setScreen("practice");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFilesFallback = async (fileList: FileList) => {
    if (fileList.length === 0) {
      setStatus("No se seleccionó ningún archivo");
      return;
    }
    const file = fileList[0];
    const text = await file.text();
    const diff = parseDiff(text);
    if (diff.files.length === 0) {
      setStatus("El diff no contiene archivos válidos");
      return;
    }
    setPractice({ diff, sourceName: file.name, diffText: text });
      setScreen("practice");
  };

  return (
    <div>
      <header className="app-header">
        <div className="app-header-brand">
          <span className="logo">DiffTyper</span>
          <span className="tagline">Delega la generación a la IA, asimila la lógica con tus propias manos.</span>
        </div>
        <div className="app-header-actions">
          {workspace && (
            <>
              <span className="chip">📁 {workspaceName}</span>
              <button type="button" className="btn btn-ghost" onClick={handleChangeWorkspace}>
                Cambiar
              </button>
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setSettingsOpen(true)}>
            <span aria-hidden="true">⚙️</span> Configuración
          </button>
          <a
            href="https://github.com/Pichuelectrico/difftyper"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost header-github-link"
            aria-label="Ver repositorio de DiffTyper en GitHub"
            title="Ver repositorio en GitHub"
          >
            <GitHubIcon />
          </a>
        </div>
      </header>
      {status && <div className="banner" role="status">{status}</div>}
      {(() => {
        const renderScreen = () => {
          switch (screen) {
            case "landing": return <WorkspacePicker supported={browserSupported} busy={busy} onOpenWorkspace={handleOpenWorkspace} onOpenFiles={handleOpenFilesFallback} />;
            case "empty": return <EmptyState workspaceName={workspaceName} busy={busy} onRescan={handleRescan} onChangeWorkspace={handleChangeWorkspace} />;
            case "list": return <DiffList workspaceName={workspaceName} entries={entries} busy={busy} onOpen={handleOpenEntry} onRescan={handleRescan} onChangeWorkspace={handleChangeWorkspace} />;
            case "practice": return practice ? <PracticeView key={practice.sourceName} diff={practice.diff} sourceName={practice.sourceName} diffText={practice.diffText} onExit={() => setScreen("list")} /> : null;
          }
        };
        return renderScreen();
      })()}
      <Footer />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HowToUse open={helpOpen} onClose={() => setHelpOpen(false)} />
      <button
        type="button"
        className="help-fab"
        aria-label="Cómo usar DiffTyper"
        aria-expanded={helpOpen}
        onClick={() => setHelpOpen((v) => !v)}
      >
        ?
      </button>
    </div>
  );
}
