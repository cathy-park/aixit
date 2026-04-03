import type { WorkspaceMemoItem, WorkspaceStep } from "@/lib/workspace-store";
import {
  createBlankProject,
  createProjectFromTemplate,
  getDashboardWorkflow,
  saveDashboardWorkflow,
} from "@/lib/workflows-store";
import type {
  IdeaNote,
  LectureNoteMetadata,
  MvpNoteMetadata,
  NovelNoteMetadata,
  NoteCategory,
} from "@/lib/notes-store";
import { appendTodayTodos } from "@/lib/today-todos-store";

function newMemoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function newStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
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

/** 프로젝트 카드·워크스페이스 상단에 보이는 한 줄 설명(설명 영역). */
function buildProjectSubtitle(note: IdeaNote, templateFallback: string): string {
  const join = (a: string, b: string) => {
    const out = [a, b].filter(Boolean).join(" · ");
    return out.length > 180 ? `${out.slice(0, 177)}…` : out;
  };
  switch (note.category) {
    case "MVP": {
      const m = note.metadata as MvpNoteMetadata;
      return join(firstLine(m.problem), firstLine(m.hypothesis)) || firstLine(note.content) || templateFallback;
    }
    case "강의": {
      const m = note.metadata as LectureNoteMetadata;
      return join(firstLine(m.target), firstLine(m.goal)) || templateFallback;
    }
    case "소설": {
      const m = note.metadata as NovelNoteMetadata;
      return firstLine(m.logline) || templateFallback;
    }
    default:
      return firstLine(note.content) || templateFallback;
  }
}

function workflowMemosFromNote(note: IdeaNote): WorkspaceMemoItem[] {
  const out: WorkspaceMemoItem[] = [];
  if (note.content.trim()) {
    out.push(memoItem(`[자유 메모]\n${note.content.trim()}`));
  }
  const meta = note.metadata as Record<string, unknown>;
  const labelMap: Record<string, string> = {
    problem: "Problem · 문제 정의",
    hypothesis: "Hypothesis · 핵심 가설",
    criticalExperience: "Experience · 핵심 경험",
    features: "Features · MVP 최소 기능",
    target: "Target · 대상·주제",
    goal: "Goal · 수강생 변화",
    curriculum: "Curriculum · 목차",
    assignment: "Assignment · 실습 과제",
    logline: "Logline · 한 줄 요약",
    worldview: "Worldview · 세계관·규칙",
    characters: "Characters · 결핍·목표",
    plot: "Plot · 갈등·기승전결",
  };
  for (const [k, label] of Object.entries(labelMap)) {
    const v = meta[k];
    if (typeof v === "string" && v.trim()) {
      out.push(memoItem(`[${label}]\n${v.trim()}`));
    }
  }
  return out;
}

function stepsForCategory(note: IdeaNote): WorkspaceStep[] {
  switch (note.category) {
    case "MVP": {
      const m = note.metadata as MvpNoteMetadata;
      return [
        stepWithMemo("문제 정의 (Problem)", m.problem ?? ""),
        stepWithMemo("핵심 가설 (Hypothesis)", m.hypothesis ?? ""),
        stepWithMemo("핵심 경험 (Critical Experience)", m.criticalExperience ?? ""),
        stepWithMemo("MVP 최소 기능 (Features)", m.features ?? ""),
      ];
    }
    case "강의": {
      const m = note.metadata as LectureNoteMetadata;
      return [
        stepWithMemo("대상·주제 (Target)", m.target ?? ""),
        stepWithMemo("학습 후 변화 (Goal)", m.goal ?? ""),
        stepWithMemo("커리큘럼 (Curriculum)", m.curriculum ?? ""),
        stepWithMemo("실습 과제 (Assignment)", m.assignment ?? ""),
      ];
    }
    case "소설": {
      const m = note.metadata as NovelNoteMetadata;
      return [
        stepWithMemo("로그라인 (Logline)", m.logline ?? ""),
        stepWithMemo("세계관·규칙 (Worldview)", m.worldview ?? ""),
        stepWithMemo("캐릭터 결핍·목표 (Characters)", m.characters ?? ""),
        stepWithMemo("갈등·기승전결 (Plot)", m.plot ?? ""),
      ];
    }
    default:
      return [stepWithMemo("메모", note.content)];
  }
}

function emojiForCategory(category: NoteCategory): string {
  switch (category) {
    case "MVP":
      return "🚀";
    case "강의":
      return "📚";
    case "소설":
      return "✍️";
    default:
      return "💡";
  }
}

function splitTodoLines(raw: string, max: number): string[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)]+\s*/u, "").trim())
    .filter(Boolean)
    .slice(0, max);
}

/** 홈「이번 주 할 일」에 넣을 초기 태스크(줄 단위 분할 우선). */
export function buildInitialTodosFromNote(note: IdeaNote): { text: string }[] {
  const title = note.title.trim() || "프로젝트";
  const prefix = `[${title}]`;
  switch (note.category) {
    case "MVP": {
      const m = note.metadata as MvpNoteMetadata;
      const lines = splitTodoLines(m.features ?? "", 12);
      if (lines.length) return lines.map((t) => ({ text: `${prefix} ${t}` }));
      return [
        { text: `${prefix} 가설 검증 계획 수립` },
        { text: `${prefix} MVP 기능 범위 확정` },
      ];
    }
    case "강의": {
      const m = note.metadata as LectureNoteMetadata;
      const lines = splitTodoLines(m.assignment ?? "", 12);
      if (lines.length) return lines.map((t) => ({ text: `${prefix} ${t}` }));
      return [
        { text: `${prefix} 커리큘럼 차시별 상세안 작성` },
        { text: `${prefix} 학습 목표·과제 정합성 검토` },
      ];
    }
    case "소설":
      return [
        { text: `${prefix} 플롯·씬 목록 구체화` },
        { text: `${prefix} 세계관 규칙 정리` },
      ];
    default:
      if (note.content.trim()) return [{ text: `${prefix} ${note.content.trim().slice(0, 120)}` }];
      return [];
  }
}

export type PromoteTemplateChoice = "blank" | string;

/**
 * 메모를 프로젝트로 승격합니다.
 * - `blank`: 기획 필드 → 단계(steps) + 워크플로 메모로 이관
 * - 템플릿 id: 내장 워크플로 템플릿 단계는 유지하고, 메모 본문·메타는 워크플로 메모 앞에 합칩니다.
 * - 공통: `subtitle`에 기획 요약, 오늘의 할 일 스토어에 초기 To-do 추가
 */
export function promoteNoteToProject(
  note: IdeaNote,
  folderId: string,
  templateChoice: PromoteTemplateChoice,
): { projectId: string } | null {
  if (typeof window === "undefined") return null;
  if (note.isConverted) return null;

  let base = null as ReturnType<typeof getDashboardWorkflow>;
  if (templateChoice === "blank") {
    base = createBlankProject(folderId);
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
          emoji: emojiForCategory(note.category),
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
          emoji: emojiForCategory(note.category),
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
  subtitle: "카테고리별 요약 (MVP: problem·hypothesis 첫 줄, 강의: target·goal, 소설: logline, 일반: 본문)",
  workflowMemos: "[자유 메모] + 각 metadata 블록(라벨 접두)",
  steps_blank: "카테고리별 4단계(또는 일반 1단계), 필드 본문 → 해당 단계 memos",
  steps_template: "템플릿 단계 유지, 메모는 workflowMemos로만 합류",
  todayTodos: "MVP: features 줄 단위 / 강의: assignment 줄 단위 / 소설·기본: 고정 2건(+본문)",
} as const;
