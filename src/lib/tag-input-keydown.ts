import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** 한글 IME 조합 중 Enter로 태그가 두 번 쪼개지는 것을 막습니다. */
export function shouldCommitTagOnEnter(e: ReactKeyboardEvent<HTMLElement>): boolean {
  if (e.key !== "Enter") return false;
  if (e.nativeEvent.isComposing) return false;
  return true;
}
