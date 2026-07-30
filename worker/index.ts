import { ASSETS } from "./generated-assets";
import { buildPrompts, type PromptInput } from "./prompts";

interface Env {
  AI: {
    run(
      model: string,
      input: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        max_tokens?: number;
        temperature?: number;
      }
    ): Promise<unknown>;
  };
  APP_ACCESS_KEY: string;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_BODY_BYTES = 32_768;
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ ok: true, service: "midot32-bible-lab" }, 200, requestId);
      }

      if (url.pathname === "/api/research") {
        if (request.method !== "POST") {
          return jsonError("METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.", 405, requestId);
        }
        if (!env.APP_ACCESS_KEY) {
          return jsonError("SERVER_CONFIG", "서버 접근 키가 설정되지 않았습니다.", 503, requestId);
        }
        const candidate = request.headers.get("X-App-Key") || "";
        if (!(await secureEqual(candidate, env.APP_ACCESS_KEY))) {
          return jsonError("UNAUTHORIZED", "유효한 접근 키가 필요합니다.", 401, requestId);
        }
        return await handleResearch(request, env, requestId);
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405, headers: SECURITY_HEADERS });
      }
      return serveAsset(url.pathname, request.method === "HEAD");
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          requestId,
          route: url.pathname,
          message: error instanceof Error ? error.message : "Unknown error"
        })
      );
      return jsonError(
        "INTERNAL_ERROR",
        "연구 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        500,
        requestId
      );
    }
  }
};

async function handleResearch(request: Request, env: Env, requestId: string): Promise<Response> {
  const startedAt = Date.now();
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("INVALID_CONTENT_TYPE", "JSON 요청만 허용됩니다.", 415, requestId);
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "BODY_TOO_LARGE";
    return jsonError(
      tooLarge ? "BODY_TOO_LARGE" : "INVALID_JSON",
      tooLarge ? "요청 본문이 너무 큽니다." : "요청 형식이 올바르지 않습니다.",
      tooLarge ? 413 : 400,
      requestId
    );
  }

  const validation = validateInput(body);
  if (!validation.ok) {
    return jsonError("VALIDATION_ERROR", validation.message, 400, requestId);
  }

  const prompts = buildPrompts(validation.value);
  const maxTokens = validation.value.depth === "deep" ? 3500 : 2300;
  const generated = await Promise.all(
    prompts.map(async (prompt) => {
      const output = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        max_tokens: maxTokens,
        temperature: 0.2
      });
      return {
        id: prompt.id,
        title: prompt.title,
        markdown: extractResponse(output)
      };
    })
  );

  if (generated.some((section) => section.markdown.trim().length < 80)) {
    throw new Error("AI returned an incomplete section");
  }

  return json(
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input: validation.value,
      sections: generated,
      meta: {
        model: MODEL,
        durationMs: Date.now() - startedAt,
        caution:
          "이 결과는 AI 연구 보조 자료입니다. 설교나 출판 전에는 성경 원문, 신뢰할 수 있는 주석, 고전 문헌과 인용 출처를 직접 대조하고 공동체의 신학적 검토를 거치세요."
      }
    },
    200,
    requestId
  );
}

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateInput(
  body: unknown
): { ok: true; value: PromptInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "연구 정보를 입력해 주세요." };
  }
  const candidate = body as Record<string, unknown>;
  const reference = typeof candidate.reference === "string" ? candidate.reference.trim() : "";
  const passage = typeof candidate.passage === "string" ? candidate.passage.trim() : "";
  const focus = typeof candidate.focus === "string" ? candidate.focus.trim() : "";
  const testament =
    candidate.testament === "old" || candidate.testament === "new" ? candidate.testament : "auto";
  const depth = candidate.depth === "standard" ? "standard" : "deep";

  if (reference.length < 2 || reference.length > 120) {
    return { ok: false, message: "성경 본문 위치를 2–120자로 입력해 주세요." };
  }
  if (passage.length < 20 || passage.length > 12_000) {
    return { ok: false, message: "연구 본문을 20–12,000자로 입력해 주세요." };
  }
  if (focus.length > 600) {
    return { ok: false, message: "연구 질문은 600자 이하로 입력해 주세요." };
  }
  return { ok: true, value: { reference, passage, focus, testament, depth } };
}

function extractResponse(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (typeof record.response === "string") return record.response;
    if (typeof record.result === "string") return record.result;
  }
  throw new Error("Unexpected Workers AI response");
}

async function secureEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0 && left.length === right.length;
}

function serveAsset(pathname: string, head: boolean): Response {
  const key = ASSETS[pathname] ? pathname : "/index.html";
  const asset = ASSETS[key];
  if (!asset) return new Response("Build assets are missing.", { status: 503, headers: SECURITY_HEADERS });
  const binary = atob(asset.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const immutable = /\/assets\/.+-[A-Za-z0-9_-]{6,}\./.test(key);
  const headers = new Headers({
    ...SECURITY_HEADERS,
    "Content-Type": asset.contentType,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache"
  });
  return new Response(head ? null : bytes, { status: 200, headers });
}

function json(value: unknown, status: number, requestId: string): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Request-Id": requestId
    }
  });
}

function jsonError(
  code: string,
  message: string,
  status: number,
  requestId: string
): Response {
  return json({ error: { code, message, requestId } }, status, requestId);
}

export const __test = { validateInput, extractResponse, secureEqual };
