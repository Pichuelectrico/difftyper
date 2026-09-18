// Cliente AI Tutor OpenAI-compatible y persistencia de endpoints

import { encryptString, decryptString, isSecureStorageAvailable } from "./secureStore";

export interface TutorEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  hasKey?: boolean;
}

// Normaliza la base URL: trim y quitar "/" final
export function normalizeBaseUrl(url: string): string {
  try {
    const trimmed = url.trim().replace(/\/+$/, "");
    return trimmed;
  } catch {
    return url;
  }
}

// Genera un id único para el endpoint
export function makeEndpointId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === "function") {
      return `ep-${c.randomUUID()}`;
    }
  } catch {
    // ignorar y usar fallback
  }
  return `ep-${Date.now()}`;
}

const KEY_ENDPOINTS = "difftyper-endpoints";
const KEY_ACTIVE = "difftyper-endpoint-active";

// Tipo persistido (enc en lugar de apiKey plano)
interface StoredEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  enc?: string;
  // legacy
  apiKey?: string;
}

export function loadEndpoints(): TutorEndpoint[] {
  try {
    const raw = localStorage.getItem(KEY_ENDPOINTS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: TutorEndpoint[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const o = item as Record<string, unknown>;
      if (typeof o["id"] !== "string" || !o["id"]) continue;
      if (typeof o["baseUrl"] !== "string") continue;
      if (typeof o["model"] !== "string") continue;
      const hasEnc = typeof o["enc"] === "string" && (o["enc"] as string).length > 0;
      const legacyKey = typeof o["apiKey"] === "string" ? (o["apiKey"] as string) : "";
      // Migración legacy: si trae apiKey plano, usarlo en memoria
      const isLegacy = !hasEnc && legacyKey.length > 0;
      valid.push({
        id: o["id"] as string,
        name: typeof o["name"] === "string" ? (o["name"] as string) : "",
        baseUrl: o["baseUrl"] as string,
        apiKey: isLegacy ? legacyKey : "",
        model: o["model"] as string,
        hasKey: hasEnc || isLegacy,
      });
    }
    return valid;
  } catch {
    return [];
  }
}

export async function saveEndpoints(list: TutorEndpoint[]): Promise<void> {
  const stored: StoredEndpoint[] = [];
  for (const ep of list) {
    const entry: StoredEndpoint = { id: ep.id, name: ep.name, baseUrl: ep.baseUrl, model: ep.model };
    if (ep.apiKey) {
      if (isSecureStorageAvailable()) {
        try {
          entry.enc = await encryptString(ep.apiKey);
        } catch {
          entry.enc = ep.apiKey;
        }
      } else {
        // Fallback sin cifrar si no hay secure storage (comportamiento legacy)
        entry.enc = ep.apiKey;
      }
    } else if (ep.hasKey) {
      // Conservar enc existente si no se cambió la clave
      try {
        const raw = localStorage.getItem(KEY_ENDPOINTS);
        if (raw) {
          const prev = JSON.parse(raw) as StoredEndpoint[];
          const found = Array.isArray(prev) ? prev.find((p) => p.id === ep.id) : undefined;
          if (found?.enc) entry.enc = found.enc;
          else if (found?.apiKey) {
            // migrar legacy
            if (isSecureStorageAvailable()) entry.enc = await encryptString(found.apiKey);
            else entry.enc = found.apiKey;
          }
        }
      } catch {
        // ignorar
      }
    }
    stored.push(entry);
  }
  localStorage.setItem(KEY_ENDPOINTS, JSON.stringify(stored));
}

export function loadActiveEndpointId(): string | null {
  try {
    const v = localStorage.getItem(KEY_ACTIVE);
    return v ?? null;
  } catch {
    return null;
  }
}

export function saveActiveEndpointId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(KEY_ACTIVE);
  } else {
    localStorage.setItem(KEY_ACTIVE, id);
  }
}

export function getActiveEndpoint(): TutorEndpoint | null {
  const activeId = loadActiveEndpointId();
  if (!activeId) return null;
  const endpoints = loadEndpoints();
  const found = endpoints.find((e) => e.id === activeId);
  return found ?? null;
}

// Resuelve la clave al momento (solo en memoria durante la petición)
async function resolveEndpointApiKey(id: string): Promise<string> {
  try {
    const raw = localStorage.getItem(KEY_ENDPOINTS);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredEndpoint[];
    const found = parsed.find((p) => p.id === id);
    if (!found) return "";
    if (found.enc) {
      if (isSecureStorageAvailable()) {
        try {
          return await decryptString(found.enc);
        } catch {
          return found.enc;
        }
      }
      return found.enc;
    }
    if (found.apiKey) return found.apiKey;
    return "";
  } catch {
    return "";
  }
}

export async function analyzeChanges(endpoint: TutorEndpoint, diffText: string): Promise<string> {
  const apiKey = await resolveEndpointApiKey(endpoint.id);
  const url = `${normalizeBaseUrl(endpoint.baseUrl)}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const body = JSON.stringify({
    model: endpoint.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Eres un tutor de código DiffTyper. Analiza el diff y responde AL GRANO: máximo 4-6 líneas en español, viñetas cortas. Solo qué cambió realmente y su propósito. Sin encabezados, sin saludos, sin explicar la sintaxis del diff salvo que sea esencial. Si el cambio es trivial, dilo en una línea.",
      },
      { role: "user", content: diffText },
    ],
  });
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", mode: "cors" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo conectar con el endpoint: ${msg}`);
  }
  if (!res.ok) throw new Error(`El endpoint respondió HTTP ${res.status}`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Respuesta inesperada del endpoint");
  }
  const content = (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) throw new Error("Respuesta inesperada del endpoint");
  return content;
}

export async function analyzeLines(endpoint: TutorEndpoint, filePath: string, targets: string[]): Promise<string[]> {
  const apiKey = await resolveEndpointApiKey(endpoint.id);
  const numbered = targets.map((t, i) => `${i + 1}| ${t}`).join("\n");
  const userContent = `Archivo: ${filePath}\n${numbered}`;
  const url = `${normalizeBaseUrl(endpoint.baseUrl)}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const body = JSON.stringify({
    model: endpoint.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Eres un tutor de código DiffTyper. Te doy un archivo y sus líneas nuevas numeradas. Devuelve EXACTAMENTE una explicación por línea, un renglón por línea, formato \"N| explicación\" (N = número de línea). Explicación: UNA frase corta en español sobre qué hace esa línea en el contexto del archivo. Sin saludos ni encabezados.",
      },
      { role: "user", content: userContent },
    ],
  });
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", mode: "cors" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo conectar con el endpoint: ${msg}`);
  }
  if (!res.ok) throw new Error(`El endpoint respondió HTTP ${res.status}`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Respuesta inesperada del endpoint");
  }
  const content2 = (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
  if (typeof content2 !== "string" || !content2) throw new Error("Respuesta inesperada del endpoint");
  const result: string[] = Array(targets.length).fill("");
  for (const line of content2.split("\n")) {
    const m = line.match(/^\s*(\d+)\s*[|.)-]\s*(.+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < result.length) result[idx] = m[2].trim();
    }
  }
  return result;
}
