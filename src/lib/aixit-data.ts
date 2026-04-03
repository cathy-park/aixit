import type { WorkflowRunStatus } from "@/lib/workflow-run-status";
import type { ProjectLifecycleStatus } from "@/lib/project-lifecycle-status";
import { getWorkflowTemplateCategoryLabelStatic } from "@/lib/workflow-template-folders-store";
import { tools } from "@/lib/tools";

export type Folder = {
  id: string;
  name: string;
  emoji: string;
};

/** 대시보드 카드·워크스페이스 공통 */
export type WorkflowStatus = WorkflowRunStatus;

export type WorkflowPreview = {
  id: string;
  folderId: string;
  title: string;
  subtitle: string;
  status: WorkflowStatus;
  /** 저장 프로젝트 카드용 간단 상태 (없으면 status에서 유도) */
  projectStatus?: ProjectLifecycleStatus;
  emoji: string;
  href: string;
  /** 완료한 단계 수 (n/m 단계 완료의 n) */
  stepsCompleted: number;
  stepsTotal: number;
  /** @deprecated 호환용 — stepsCompleted 사용 */
  stepsDone?: number;
  ddayLabel: string;
  progressPercentLabel: string;
  /** 진행률 바용 0–100 */
  progressPercent: number;
  toolsCount: number;
  startDate?: string;
  endDate?: string;
  /** 카드에 겹쳐 보여줄 도구 id (최대 3) */
  previewToolIds?: string[];
};

export type WorkflowStep = {
  id: string;
  toolName: string;
  statusLabel: string;
  /** 사용자 템플릿 등: 프로젝트에서 복사한 도구 id (있으면 이름 매핑보다 우선) */
  toolIds?: string[];
};

export type WorkflowDetail = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  progress: { done: number; total: number; percentLabel: string };
  steps: WorkflowStep[];
  schedule: { start: string; due: string; budget: string };
  people: Array<{ initial: string; name: string }>;
  links: Array<{ label: string; href: string }>;
  memo: string[];
};

export const folders: Folder[] = [
  { id: "all", name: "전체", emoji: "📋" },
  { id: "ddokdi", name: "똑디", emoji: "💼" },
  { id: "naebae", name: "내배캠", emoji: "🎓" },
  { id: "hobby", name: "취미", emoji: "🎨" },
];

export const workflows: WorkflowPreview[] = [
  {
    id: "night-coding",
    folderId: "wf-cat-dev",
    title: "밤샘 코딩",
    subtitle: "로그인 기능 구현하기",
    status: "진행중",
    emoji: "",
    href: "/workflow/night-coding",
    stepsCompleted: 2,
    stepsTotal: 3,
    stepsDone: 2,
    ddayLabel: "D-16",
    progressPercentLabel: "66%",
    progressPercent: 66,
    toolsCount: 3,
    startDate: "2026-03-28",
    endDate: "2026-04-03",
    previewToolIds: ["tool_chatgpt", "tool_cursor", "tool_vercel"],
  },
  {
    id: "detail-planning",
    folderId: "wf-cat-plan",
    title: "상세페이지 기획",
    subtitle: "이커머스 제품 상세 구조 잡기",
    status: "보류",
    emoji: "",
    href: "/workflow/detail-planning",
    stepsCompleted: 1,
    stepsTotal: 4,
    stepsDone: 1,
    ddayLabel: "D-42",
    progressPercentLabel: "25%",
    progressPercent: 25,
    toolsCount: 2,
    startDate: "2026-03-01",
    endDate: "2026-05-15",
    previewToolIds: ["tool_figma", "tool_notion"],
  },
  {
    id: "deploy-ready",
    folderId: "wf-cat-dev",
    title: "배포 준비",
    subtitle: "프로덕션 체크리스트 완료",
    status: "진행중",
    emoji: "",
    href: "/workflow/deploy-ready",
    stepsCompleted: 0,
    stepsTotal: 5,
    stepsDone: 0,
    ddayLabel: "D-90",
    progressPercentLabel: "0%",
    progressPercent: 0,
    toolsCount: 2,
    startDate: "2026-04-01",
    endDate: "2026-07-01",
    previewToolIds: ["tool_github", "tool_vercel"],
  },
];

export const workflowDetails: WorkflowDetail[] = [
  {
    id: "night-coding",
    slug: "night-coding",
    title: "밤샘 코딩 워크플로우",
    emoji: "",
    progress: { done: 2, total: 3, percentLabel: "67%" },
    steps: [
      { id: "claude", toolName: "Claude", statusLabel: "기획 완료" },
      { id: "cursor", toolName: "Cursor", statusLabel: "코딩 완료" },
      { id: "vercel", toolName: "Vercel", statusLabel: "대기 중" },
    ],
    schedule: { start: "3/28", due: "4/2", budget: "5,000,000원" },
    people: [
      { initial: "김", name: "김개발" },
      { initial: "이", name: "이디자인" },
    ],
    links: [
      { label: "Figma 디자인", href: "https://figma.com/design/example" },
      { label: "API 문서", href: "https://docs.example.com/" },
    ],
    memo: [
      "클라이언트 요청사항: 로그인 후 대시보드로 자동 이동",
      "소셜 로그인 필수 (구글, 카카오)",
    ],
  },
  {
    id: "detail-planning",
    slug: "detail-planning",
    title: "상세페이지 기획",
    emoji: "",
    progress: { done: 1, total: 4, percentLabel: "25%" },
    steps: [
      { id: "step-1", toolName: "Figma", statusLabel: "진행중" },
      { id: "step-2", toolName: "Notion", statusLabel: "대기" },
      { id: "step-3", toolName: "Slack", statusLabel: "대기" },
      { id: "step-4", toolName: "Docs", statusLabel: "대기" },
    ],
    schedule: { start: "—", due: "—", budget: "—" },
    people: [],
    links: [],
    memo: ["메모 추가"],
  },
  {
    id: "deploy-ready",
    slug: "deploy-ready",
    title: "배포 준비",
    emoji: "",
    progress: { done: 0, total: 5, percentLabel: "0%" },
    steps: [
      { id: "step-1", toolName: "Checklist", statusLabel: "대기" },
      { id: "step-2", toolName: "CI", statusLabel: "대기" },
      { id: "step-3", toolName: "QA", statusLabel: "대기" },
      { id: "step-4", toolName: "Vercel", statusLabel: "대기" },
      { id: "step-5", toolName: "Monitor", statusLabel: "대기" },
    ],
    schedule: { start: "—", due: "—", budget: "—" },
    people: [],
    links: [],
    memo: ["메모 추가"],
  },
];

export function getWorkflowDetail(slug: string) {
  return workflowDetails.find((w) => w.slug === slug) ?? null;
}

/** 템플릿 단계의 toolName → 카탈로그 tool id (실제 사용 도구 미리보기용) */
export function toolIdsFromWorkflowDetailSteps(detail: WorkflowDetail | undefined): string[] {
  if (!detail?.steps?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const step of detail.steps) {
    const raw = step.toolName.trim();
    if (!raw) continue;
    const nameLower = raw.toLowerCase();
    const t =
      tools.find((x) => x.name.toLowerCase() === nameLower) ??
      tools.find((x) => {
        const xl = x.name.toLowerCase();
        return nameLower.includes(xl) || xl.includes(nameLower);
      });
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t.id);
      if (out.length >= 3) break;
    }
  }
  return out;
}

/** 템플릿 라이브러리(워크플로우 메뉴)용 요약 */
export type WorkflowTemplateListItem = {
  templateId: string;
  slug: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** 템플릿 카테고리 폴더 id (wf-cat-*) */
  categoryId: string;
  categoryLabel: string;
  stepCount: number;
  previewToolIds: string[];
};

export function listWorkflowTemplates(): WorkflowTemplateListItem[] {
  return workflows.map((w) => {
    const d = workflowDetails.find((x) => x.id === w.id);
    const rawTitle = d?.title ?? w.title;
    const title = rawTitle.replace(/\s*workflow\s*$/i, "").trim() || rawTitle;
    const fromSteps = toolIdsFromWorkflowDetailSteps(d);
    return {
      templateId: w.id,
      slug: d?.slug ?? w.id,
      title,
      subtitle: w.subtitle,
      emoji: w.emoji,
      categoryId: w.folderId,
      categoryLabel: getWorkflowTemplateCategoryLabelStatic(w.folderId),
      stepCount: d?.steps.length ?? w.stepsTotal,
      previewToolIds: fromSteps.length ? fromSteps : (w.previewToolIds ?? []),
    };
  });
}

