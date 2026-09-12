declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
      id?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

export interface DiffFileEntry {
  name: string;
  path: string;
  handle: FileSystemFileHandle;
  size: number;
  fromDifftyper: boolean;
}

const EXCLUDED = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".venv",
  "__pycache__",
  ".cache",
]);

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function pickWorkspace(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) return null;
    const dir = await window.showDirectoryPicker({ mode: "read" });
    return dir;
  } catch {
    return null;
  }
}

export async function scanForDiffs(
  dir: FileSystemDirectoryHandle,
): Promise<DiffFileEntry[]> {
  const results: DiffFileEntry[] = [];
  await scanRecursive(dir, "", 0, results);
  results.sort((a, b) => {
    if (a.fromDifftyper !== b.fromDifftyper) return a.fromDifftyper ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
  return results;
}

async function scanRecursive(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  depth: number,
  out: DiffFileEntry[],
): Promise<void> {
  if (depth > 8) return;
  let iterator: AsyncIterableIterator<FileSystemHandle>;
  try {
    iterator = (
      dir as unknown as { values(): AsyncIterableIterator<FileSystemHandle> }
    ).values();
  } catch {
    return;
  }
  for await (const handle of iterator) {
    if (handle.kind === "directory") {
      if (EXCLUDED.has(handle.name)) continue;
      try {
        const subDir = handle as FileSystemDirectoryHandle;
        const nextPrefix = prefix ? `${prefix}/${handle.name}` : handle.name;
        await scanRecursive(subDir, nextPrefix, depth + 1, out);
      } catch {
        // Ignorar errores de permiso y continuar
      }
    } else if (handle.kind === "file") {
      if (!/\.(diff|patch)$/i.test(handle.name)) continue;
      const fileHandle = handle as FileSystemFileHandle;
      const relPath = prefix ? `${prefix}/${handle.name}` : handle.name;
      let size = 0;
      try {
        size = (await fileHandle.getFile()).size;
      } catch {
        size = 0;
      }
      out.push({
        name: handle.name,
        path: relPath,
        handle: fileHandle,
        size,
        fromDifftyper: relPath.startsWith(".difftyper/"),
      });
    }
  }
}

export async function readDiffText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}
