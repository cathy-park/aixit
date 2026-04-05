"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * 메모 본문 — 저장은 plain text, 표시 시만 스타일.
 * - `**굵게**` · `__굵게__`
 * - `*기울임*` · `_기울임_` (한 덩어리 안에 같은 구분자 중복 없음을 권장)
 * - `%%얇게%%` (가독용 가벼운 굵기 — 기존 데이터 호환)
 * 중첩 가능.
 */

type OpenKind = "boldStar" | "boldUnder" | "thin" | "emStar" | "emUnder";

function findNextOpen(s: string, i: number): { kind: OpenKind; pos: number } | null {
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    const n = s[j + 1];
    if (c === "*" && n === "*") return { kind: "boldStar", pos: j };
    if (c === "_" && n === "_") return { kind: "boldUnder", pos: j };
    if (c === "%" && n === "%") return { kind: "thin", pos: j };
    if (c === "*" && n !== "*") return { kind: "emStar", pos: j };
    if (c === "_" && n !== "_") return { kind: "emUnder", pos: j };
  }
  return null;
}

function findClosingSingleStar(s: string, from: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] !== "*") continue;
    if (s[j + 1] === "*") {
      j++;
      continue;
    }
    return j;
  }
  return -1;
}

function findClosingSingleUnder(s: string, from: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] !== "_") continue;
    if (s[j + 1] === "_") {
      j++;
      continue;
    }
    return j;
  }
  return -1;
}

function walk(s: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let nk = 0;
  const key = () => `${keyBase}-${nk++}`;

  while (i < s.length) {
    const hit = findNextOpen(s, i);
    if (!hit) {
      if (i < s.length) nodes.push(s.slice(i));
      break;
    }
    if (hit.pos > i) nodes.push(s.slice(i, hit.pos));

    let close: number;
    let openLen = 2;
    let closeLen = 2;

    switch (hit.kind) {
      case "boldStar":
        close = s.indexOf("**", hit.pos + 2);
        break;
      case "boldUnder":
        close = s.indexOf("__", hit.pos + 2);
        break;
      case "thin":
        close = s.indexOf("%%", hit.pos + 2);
        break;
      case "emStar":
        openLen = 1;
        closeLen = 1;
        close = findClosingSingleStar(s, hit.pos + 1);
        break;
      case "emUnder":
        openLen = 1;
        closeLen = 1;
        close = findClosingSingleUnder(s, hit.pos + 1);
        break;
      default:
        close = -1;
    }

    if (close < 0) {
      nodes.push(s.slice(hit.pos));
      break;
    }

    const inner = s.slice(hit.pos + openLen, close);
    const innerNodes = inner ? walk(inner, `${key()}-i`) : [];

    switch (hit.kind) {
      case "boldStar":
      case "boldUnder":
        nodes.push(
          <strong key={key()} className="font-bold text-zinc-900">
            {innerNodes.length ? innerNodes : null}
          </strong>,
        );
        break;
      case "thin":
        nodes.push(
          <span key={key()} className="font-light text-zinc-600">
            {innerNodes.length ? innerNodes : null}
          </span>,
        );
        break;
      case "emStar":
      case "emUnder":
        nodes.push(
          <em key={key()} className="italic text-zinc-800">
            {innerNodes.length ? innerNodes : null}
          </em>,
        );
        break;
    }
    i = close + closeLen;
  }
  return nodes;
}

export function renderMemoMiniMarkup(text: string): ReactNode {
  if (!text) return null;
  const parts = walk(text, "m");
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return <Fragment>{parts}</Fragment>;
}

export const MEMO_CHECKBOX_LINE = /^\s*-\s*\[\s*([xX ])\s*\]\s*(.*)$/;

/**
 * 본문 전체에서 n번째(0부터) 마크다운 체크 줄만 `- [ ]` ↔ `- [x]` 토글합니다.
 * 줄 단위로 `MEMO_CHECKBOX_LINE`에 매칭되는 것만 세어 인덱스를 맞춥니다.
 */
export function toggleNthMarkdownCheckbox(fullText: string, zeroBasedIndex: number): string {
  const normalized = fullText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let seen = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li] ?? "";
    if (!MEMO_CHECKBOX_LINE.test(line)) continue;
    if (seen === zeroBasedIndex) {
      const m = MEMO_CHECKBOX_LINE.exec(line);
      if (!m) return fullText;
      const inner = m[1];
      const checked = inner.toLowerCase() === "x";
      lines[li] = line.replace(/^(\s*-\s*)\[\s*[xX ]\s*\]/, (_, lead: string) => (checked ? `${lead}[ ]` : `${lead}[x]`));
      return lines.join("\n");
    }
    seen++;
  }
  return fullText;
}

export type MemoDocumentRenderOptions = {
  /** true면 체크박스를 `<input type="checkbox">`로 두고 `onToggleCheckbox` 호출 */
  interactiveCheckboxes?: boolean;
  /** 문서 안에서 등장하는 순서(0,1,2…)의 체크 항목 인덱스 */
  onToggleCheckbox?: (globalCheckboxIndex: number) => void;
};

/**
 * 블록 단위: 체크박스 리스트, `-` 불릿, 빈 줄, 단락. 인라인은 `renderMemoMiniMarkup` 재사용.
 */
export function renderMemoDocument(text: string, opts?: MemoDocumentRenderOptions): ReactNode {
  const raw = text.replace(/\r\n/g, "\n");
  if (!raw.trim()) return null;
  const lines = raw.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  let checkboxSerial = 0;
  const interactive = Boolean(opts?.interactiveCheckboxes && opts?.onToggleCheckbox);

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (MEMO_CHECKBOX_LINE.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const m = MEMO_CHECKBOX_LINE.exec(lines[i] ?? "");
        if (!m) break;
        const checked = m[1].toLowerCase() === "x";
        const body = m[2] ?? "";
        const cbIndex = checkboxSerial++;
        items.push(
          <li key={`cb-${b}-${items.length}`} className="flex gap-2">
            {interactive ? (
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  e.stopPropagation();
                  opts.onToggleCheckbox?.(cbIndex);
                }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 text-sky-600 accent-sky-600 focus:ring-sky-400",
                )}
                aria-label={checked ? "완료 취소" : "완료로 표시"}
              />
            ) : (
              <span
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-[10px] font-bold leading-none text-white",
                  checked && "border-sky-600 bg-sky-600",
                )}
                aria-hidden
              >
                {checked ? "✓" : null}
              </span>
            )}
            <span className="min-w-0 select-text">{renderMemoMiniMarkup(body)}</span>
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul key={`ulc-${b++}`} className="my-1 list-none space-y-1.5 pl-0">
          {items}
        </ul>,
      );
      continue;
    }

    const bullet = /^\s*-\s+(.+)$/.exec(line);
    if (bullet) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const rawLine = lines[i] ?? "";
        if (MEMO_CHECKBOX_LINE.test(rawLine)) break;
        const bm = /^\s*-\s+(.+)$/.exec(rawLine);
        if (!bm) break;
        items.push(
          <li key={`li-${b}-${items.length}`} className="ml-1 list-disc pl-4 marker:text-zinc-400">
            {renderMemoMiniMarkup(bm[1])}
          </li>,
        );
        i++;
      }
      if (items.length) {
        blocks.push(
          <ul key={`ulb-${b++}`} className="my-1 list-disc space-y-1 pl-5">
            {items}
          </ul>,
        );
        continue;
      }
    }

    if (!line.trim()) {
      i++;
      blocks.push(<div key={`sp-${b++}`} className="h-2 shrink-0" aria-hidden />);
      continue;
    }

    blocks.push(
      <p key={`p-${b++}`} className="my-0 min-w-0 whitespace-pre-wrap break-words">
        {renderMemoMiniMarkup(line)}
      </p>,
    );
    i++;
  }

  if (blocks.length === 0) return null;
  if (blocks.length === 1) return blocks[0];
  return <div className="memo-markup-doc space-y-1">{blocks}</div>;
}
