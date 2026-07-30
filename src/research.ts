import type { ApiError, ResearchInput, ResearchResult } from "./types";

export class ResearchError extends Error {
  code: string;
  requestId?: string;

  constructor(message: string, code = "UNKNOWN", requestId?: string) {
    super(message);
    this.code = code;
    this.requestId = requestId;
  }
}

export async function createResearch(
  input: ResearchInput,
  accessKey: string,
  signal?: AbortSignal
): Promise<ResearchResult> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Key": accessKey
    },
    body: JSON.stringify(input),
    signal
  });

  if (!response.ok) {
    let payload: ApiError = {};
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      // The status text below still provides a useful fallback.
    }
    throw new ResearchError(
      payload.error?.message || `연구 요청에 실패했습니다. (${response.status})`,
      payload.error?.code || "HTTP_ERROR",
      payload.error?.requestId
    );
  }

  return (await response.json()) as ResearchResult;
}
