import { isWorkflowRunStatus, type WorkflowRunStatus } from "@/lib/workflow-run-status";
import type { IdeaNote } from "@/lib/notes-store";

/** 메모 카드·필터용 WorkflowRunStatus (전환 완료 = 완료) */
export function memoNoteRunStatus(note: IdeaNote): WorkflowRunStatus {
  if (note.isConverted) return "완료";
  const s = note.projectStatus;
  if (isWorkflowRunStatus(s)) return s;
  return "시작전";
}

function passesMemoVisibility(note: IdeaNote, v: StatusVisibilityFilter): boolean {
  return Boolean(v[memoNoteRunStatus(note)]);
}

/**
 * 검색·정렬된 폴더 내 목록을 메인(비완료·노출 상태) / 완료 그룹으로 나눕니다.
 * - 메인: 완료가 아니고 `visibility`에 해당하는 상태만
 * - 완료: `memoNoteRunStatus === 완료` (검색은 이미 displayList에 반영)
 */
export function partitionMemoDisplayByExposure(
  displayList: IdeaNote[],
  visibility: StatusVisibilityFilter,
): { mainItems: IdeaNote[]; completedItems: IdeaNote[] } {
  const mainItems: IdeaNote[] = [];
  const completedItems: IdeaNote[] = [];
  for (const n of displayList) {
    const rs = memoNoteRunStatus(n);
    if (rs === "완료") {
      completedItems.push(n);
    } else if (passesMemoVisibility(n, visibility)) {
      mainItems.push(n);
    }
  }
  return { mainItems, completedItems };
}
