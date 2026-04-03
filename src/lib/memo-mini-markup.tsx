"use client";

import { Fragment, type ReactNode } from "react";

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
