import type { ResearchResult } from "./types";

export function toMarkdown(result: ResearchResult): string {
  const { input, sections, createdAt } = result;
  const front = [
    `# ${input.reference} — 32가지 미도트 연구`,
    "",
    `- 생성 시각: ${new Date(createdAt).toLocaleString("ko-KR")}`,
    `- 연구 깊이: ${input.depth === "deep" ? "심층" : "표준"}`,
    input.focus ? `- 연구 초점: ${input.focus}` : "",
    "",
    "## 연구 본문",
    "",
    input.passage,
    "",
    "---",
    ""
  ].filter(Boolean);
  const body = sections.flatMap((section) => [
    `# ${section.title}`,
    "",
    section.markdown.trim(),
    "",
    "---",
    ""
  ]);
  return [...front, ...body, `> ${result.meta.caution}`, ""].join("\n");
}

export function downloadMarkdown(result: ResearchResult): void {
  const blob = new Blob([toMarkdown(result)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(result.input.reference)}-미도트32-연구.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyMarkdown(result: ResearchResult): Promise<void> {
  await navigator.clipboard.writeText(toMarkdown(result));
}

function safeFilename(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_") || "성경본문";
}
