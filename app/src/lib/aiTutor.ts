// Cliente AI Tutor OpenAI-compatible y persistencia de endpoints

export interface TutorEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
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

export function loadEndpoints(): TutorEndpoint[] {
  try {
    const raw = localStorage.getItem(KEY_ENDPOINTS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Type-guard: filtrar elementos inválidos/corruptos
    const valid: TutorEndpoint[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const o = item as Record<string, unknown>;
      if (typeof o["id"] !== "string" || !o["id"]) continue;
      if (typeof o["baseUrl"] !== "string") continue;
      if (typeof o["model"] !== "string") continue;
      valid.push({
        id: o["id"] as string,
        name: typeof o["name"] === "string" ? (o["name"] as string) : "",
        baseUrl: o["baseUrl"] as string,
        apiKey: typeof o["apiKey"] === "string" ? (o["apiKey"] as string) : "",
        model: o["model"] as string,
      });
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveEndpoints(list: TutorEndpoint[]): void {
  localStorage.setItem(KEY_ENDPOINTS, JSON.stringify(list));
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

export async function analyzeChanges(
  endpoint: TutorEndpoint,
  diffText: string,
): Promise<string> {
  const url = `${normalizeBaseUrl(endpoint.baseUrl)}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (endpoint.apiKey) {
    headers["Authorization"] = `Bearer ${endpoint.apiKey}`;
  }
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
    res = await fetch(url, { method: "POST", headers, body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo conectar con el endpoint: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`El endpoint respondió HTTP ${res.status}`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Respuesta inesperada del endpoint");
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("Respuesta inesperada del endpoint");
  }
  return content;
}

// Tutor línea por línea: una llamada para todo el archivo
export async function analyzeLines(
  endpoint: TutorEndpoint,
  filePath: string,
  targets: string[],
): Promise<string[]> {
  const numbered = targets.map((t, i) => `${i + 1}| ${t}`).join("\n");
  const userContent = `Archivo: ${filePath}\n${numbered}`;
  const url = `${normalizeBaseUrl(endpoint.baseUrl)}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (endpoint.apiKey) headers["Authorization"] = `Bearer ${endpoint.apiKey}`;
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
    res = await fetch(url, { method: "POST", headers, body });
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
  const content2 = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content2 !== "string" || !content2) throw new Error("Respuesta inesperada del endpoint");
  // Parseo tolerante
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
