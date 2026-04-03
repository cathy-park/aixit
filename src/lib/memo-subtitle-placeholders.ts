/** 메모 섹션에 남은 대괄호 힌트만 있는 줄(예: `[대상]`, `[수강 전]`) — 카드 부제로 쓰지 않음 */

export function isBracketLabelPlaceholder(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && /^\[[^\]]+\]$/u.test(t);
}

/** `A · B` 형태에서 대괄호 라벨만인 조각 제거. 전체가 한 덩어리 라벨이면 비움. */
export function stripBracketPlaceholderSubtitle(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (isBracketLabelPlaceholder(t)) return "";
  const parts = t.split(/\s*·\s*/u).map((s) => s.trim()).filter(Boolean);
  const kept = parts.filter((p) => !isBracketLabelPlaceholder(p));
  return kept.join(" · ").trim();
}
