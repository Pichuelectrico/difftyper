// Almacenamiento seguro AES-GCM 256 con clave no extraíble en IndexedDB.
// Estilo never-throw: fallos devuelven fallback sin lanzar.

const DB_NAME = "difftyper-secure";
const STORE = "keys";
const RECORD = "master";

// Verifica disponibilidad de almacenamiento seguro
export function isSecureStorageAvailable(): boolean {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return false;
    if (typeof indexedDB === "undefined") return false;
    // http sin localhost no es contexto seguro
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      const host = window.location.hostname;
      if (host !== "localhost" && host !== "127.0.0.1" && host !== "") return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Abre o crea la DB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function getOrCreateKey(): Promise<CryptoKey | null> {
  try {
    const db = await openDB();
    const key: CryptoKey | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(RECORD);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error);
    });
    if (key) {
      db.close();
      return key;
    }
    const newKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(newKey, RECORD);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return newKey;
  } catch {
    return null;
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Cifra un string → JSON base64 {iv,ct}
export async function encryptString(plain: string): Promise<string> {
  try {
    const key = await getOrCreateKey();
    if (!key) return plain;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plain);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return JSON.stringify({ iv: toBase64(iv.buffer as ArrayBuffer), ct: toBase64(ct) });
  } catch {
    return plain;
  }
}

// Descifra payload JSON base64 → string
export async function decryptString(payload: string): Promise<string> {
  try {
    const obj = JSON.parse(payload) as { iv: string; ct: string };
    if (!obj.iv || !obj.ct) return payload;
    const key = await getOrCreateKey();
    if (!key) return payload;
    const iv = fromBase64(obj.iv);
    const ct = fromBase64(obj.ct);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return payload;
  }
}
