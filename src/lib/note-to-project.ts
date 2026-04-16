import type { WorkspaceMemoItem, WorkspaceStep } from "@/lib/workspace-store";
import {
  createBlankProject,
  createProjectFromTemplate,
  saveDashboardWorkflow,
} from "@/lib/workflows-store";
import type { IdeaNote } from "@/lib/notes-store";
import { appendTodayTodos } from "@/lib/today-todos-store";
import {
  createProjectFromUserTemplate,
  getUserWorkflowTemplateById,
} from "@/lib/user-workflow-templates-store";
import { isBracketLabelPlaceholder } from "@/lib/memo-subtitle-placeholders";

function newMemoId() {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function newStepId() {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function memoItem(text: string): WorkspaceMemoItem {
  return { id: newMemoId(), text };
}

function stepWithMemo(title: string, body: string): WorkspaceStep {
  return {
    id: newStepId(),
    title,
    toolIds: [],
    memos: body.trim() ? [memoItem(body.trim())] : [],
  };
}

function firstLine(s?: string): string {
  const t = s?.trim() ?? "";
  if (!t) return "";
  return t.split(/\n/)[0]?.trim() ?? "";
}

function buildProjectSubtitle(note: IdeaNote, templateFallback: string): string {
  const firstMeaningfulLine = (raw?: string) => {
    const line = firstLine(raw);
    if (!line || isBracketLabelPlaceholder(line)) return "";
    return line;
  };
  return firstMeaningfulLine(note.content) || templateFallback;
}

function workflowMemosFromNote(note: IdeaNote): WorkspaceMemoItem[] {
  const out: WorkspaceMemoItem[] = [];
  if (note.content.trim()) {
    out.push(memoItem(`[메모본문]\n${note.content.trim()}`));
  }
  return out;
}

function stepsForCategory(note: IdeaNote): WorkspaceStep[] {
  return [stepWithMemo("메모", note.content)];
}

export function buildInitialTodosFromNote(note: IdeaNote): { text: string }[] {
  const title = note.title.trim() || "프로젝트";
  const prefix = `[${title}]`;
  if (note.content.trim()) return [{ text: `${prefix} ${note.content.trim().slice(0, 120)}` }];
  return [];
}

export type PromoteTemplateChoice = "blank" | string;

/**
 * 메모를 프로젝트로 승격합니다. (구조형 필드 연동 중단 - 자유 메모 기반)
 */
export function promoteNoteToProject(
  note: IdeaNote,
  folderId: string,
  templateChoice: PromoteTemplateChoice,
): { projectId: string } | null {
  if (typeof window === "undefined") return null;
  if (note.isConverted) return null;

  let base = null;
  if (templateChoice === "blank") {
    base = createBlankProject(folderId);
  } else if (getUserWorkflowTemplateById(templateChoice)) {
    base = createProjectFromUserTemplate(templateChoice, folderId);
  } else {
    base = createProjectFromTemplate(templateChoice, folderId);
  }
  if (!base) return null;

  const projectId = base.id;
  const name = note.title.trim() || base.name.trim() || "제목 없는 아이디어";
  const noteMemos = workflowMemosFromNote(note);
  const templateMemos = base.workflowMemos ?? [];
  const mergedMemos = [...noteMemos, ...templateMemos];

  const next =
    templateChoice === "blank"
      ? {
          ...base,
          name,
          subtitle: buildProjectSubtitle(note, base.subtitle ?? ""),
          status: "준비중" as const,
          projectStatus: "waiting" as const,
          currentStepIndex: 0,
          completedAt: undefined,
          emoji: "💡",
          workflowMemos: mergedMemos,
          steps: stepsForCategory(note),
          origin: "idea" as const,
          originIdeaId: note.id,
        }
      : {
          ...base,
          name,
          subtitle: buildProjectSubtitle(note, base.subtitle ?? ""),
          status: "준비중" as const,
          projectStatus: "waiting" as const,
          currentStepIndex: 0,
          completedAt: undefined,
          emoji: "💡",
          workflowMemos: mergedMemos,
          origin: "idea" as const,
          originIdeaId: note.id,
        };

  saveDashboardWorkflow(next);
  appendTodayTodos(buildInitialTodosFromNote(note));

  return { projectId };
}

/** 메모 → 프로젝트 필드 매핑 요약(기획 보고용). */
export const NOTE_TO_PROJECT_FIELD_MAP = {
  name: "note.title",
  subtitle: "본문 첫 줄",
  workflowMemos: "[메모본문] 필드 전체",
  steps_blank: "단일 '메모' 단계 생성",
  steps_template: "템플릿 단계 유지, 메모는 workflowMemos로 합류",
  todayTodos: "기본: 본문에서 추출된 할 일 1건",
} as const;
