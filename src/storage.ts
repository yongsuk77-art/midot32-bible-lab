import type { ResearchResult } from "./types";

const HISTORY_KEY = "midot32:history:v1";
const ACCESS_KEY = "midot32:access-key:v1";
const MAX_HISTORY = 8;

export function loadHistory(): ResearchResult[] {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    return value ? (JSON.parse(value) as ResearchResult[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(result: ResearchResult): ResearchResult[] {
  const next = [result, ...loadHistory().filter((item) => item.id !== result.id)].slice(
    0,
    MAX_HISTORY
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Long studies can exceed browser storage. Keep the latest study only.
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([result]));
    } catch {
      // The result still remains available in the current session.
    }
  }
  return next;
}

export function removeHistory(id: string): ResearchResult[] {
  const next = loadHistory().filter((item) => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function getAccessKey(): string {
  return localStorage.getItem(ACCESS_KEY) || "";
}

export function setAccessKey(value: string): void {
  if (value) localStorage.setItem(ACCESS_KEY, value);
  else localStorage.removeItem(ACCESS_KEY);
}
