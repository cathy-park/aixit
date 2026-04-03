export const LAYOUT_ENTRY_MIME = "application/x-aixit-layout-entry";

export const TEMPLATE_CARD_MIME = "application/x-aixit-template-card";

export const DASHBOARD_FOLDER_DND_MIME = "application/x-aixit-dashboard-folder";

export const WORKFLOW_TEMPLATE_FOLDER_DND_MIME = "application/x-aixit-workflow-template-folder";

/** 메모 카드 레이아웃 DnD */
import type { DragEvent as ReactDragEvent } from "react";

export const MEMO_ENTRY_MIME = "application/x-aixit-memo-entry";

/**
 * 카드 바깥 래퍼가 `draggable`일 때, 버튼·링크 등에서 시작한 네이티브 드래그를 막습니다.
 * 그렇지 않으면 클릭이 드래그로 처리되어 상태 칩·메뉴가 동작하지 않을 수 있습니다.
 */
export function cancelNativeCardLayoutDragIfInteractive(e: ReactDragEvent<Element>): boolean {
  const raw = e.target;
  if (!raw || typeof (raw as Node).nodeType !== "number") return false;
  const el = raw instanceof Element ? raw : (raw as Node).parentElement;
  if (!el) return false;
  const hit = el.closest(
    "button,a[href],input,select,textarea,[role='button'],[role='menuitem'],[role='option'],[contenteditable='true']",
  );
  if (!hit) return false;
  e.preventDefault();
  return true;
}
