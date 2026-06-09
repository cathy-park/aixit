import type { MeetingMinute } from "./minutes-store";
import TurndownService from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

/**
 * 단일 회의록을 ChatGPT에 붙여넣기 좋은 Markdown 형식으로 변환합니다.
 */
export function formatMinuteToMarkdown(minute: MeetingMinute, folderName: string): string {
  const mdContent = turndownService.turndown(minute.content || "");
  
  return `
# [${folderName}] ${minute.title}
- **일자**: ${minute.date}

---

${mdContent}
  `.trim();
}

/**
 * 폴더 내 전체 회의록을 하나의 Markdown으로 묶습니다.
 */
export function formatFolderToMarkdown(folderName: string, minutes: MeetingMinute[]): string {
  if (minutes.length === 0) {
    return `# ${folderName} 회의록\n\n작성된 회의록이 없습니다.`;
  }

  const sorted = [...minutes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const docs = sorted.map((m) => {
    const mdContent = turndownService.turndown(m.content || "");
    return `
## ${m.title}
- **일자**: ${m.date}

${mdContent}
    `.trim();
  });

  return `
# ${folderName} 전체 회의록 모음

---

${docs.join("\n\n---\n\n")}
  `.trim();
}

/**
 * 마크다운 텍스트를 클립보드에 복사합니다.
 */
export async function copyMarkdownToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy", err);
    return false;
  }
}

/**
 * 마크다운 텍스트를 .md 파일로 다운로드합니다.
 */
export function downloadMarkdownFile(filename: string, text: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
