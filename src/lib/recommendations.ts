import type { DashboardFolderIconType } from "@/lib/dashboard-folders-store";

export type RecommendedStep = {
  title: string;
  description?: string;
  tips?: string[];
  toolIds: string[];
  primaryToolId?: string;
  /** 내비게이터: 도구 없을 때 표시 */
  stepFallbackEmoji?: string;
  stepFallbackColor?: string;
  stepFallbackImageUrl?: string;
  stepNavigatorIconType?: DashboardFolderIconType;
  stepFallbackLucideIcon?: string;
};

export type RecommendationResult = {
  taskType: string;
  taskTitle: string;
  taskDescription: string;
  steps: RecommendedStep[];
  jittoMessage: string;
};

export const recommendationPresets: Record<string, RecommendationResult> = {
  website: {
    taskType: "website",
    taskTitle: "웹사이트 만들기",
    taskDescription: "처음부터 구현까지, 덜 헤매도록 순서를 추천해드릴게요",
    jittoMessage: "이 순서대로 하면 덜 헤매요",
    steps: [
      {
        title: "구조와 방향 정리",
        description: "사이트 목적, 대상, 주요 페이지를 정리하고 전체 구조를 잡아요.",
        toolIds: ["tool_chatgpt", "tool_relume"],
        primaryToolId: "tool_chatgpt",
        tips: ["먼저 ‘누가/무엇을/왜’부터 한 문장으로 정리해보세요.", "페이지 수를 줄이면 구현이 빨라져요."],
      },
      {
        title: "화면 흐름과 UI 설계",
        description: "사용자가 어떤 순서로 이동하는지 흐름을 만들고 화면 구성을 설계해요.",
        toolIds: ["tool_figma", "tool_make"],
        primaryToolId: "tool_figma",
        tips: ["홈 → 핵심 기능 → 전환(문의/가입) 흐름을 먼저 잡아보세요."],
      },
      {
        title: "구현 시작",
        description: "디자인/구조를 기준으로 실제 화면을 구현하고 기능을 붙여요.",
        toolIds: ["tool_cursor", "tool_replit"],
        primaryToolId: "tool_cursor",
        tips: ["가장 중요한 페이지 1개부터 완성하면 방향이 빨리 잡혀요."],
      },
      {
        title: "배포 및 점검",
        description: "배포 후 성능/SEO/링크/모바일 대응을 빠르게 점검해요.",
        toolIds: ["tool_vercel"],
        primaryToolId: "tool_vercel",
        tips: ["모바일에서 버튼/입력/스크롤이 불편하지 않은지 먼저 확인해보세요."],
      },
    ],
  },
  "landing-page": {
    taskType: "landing-page",
    taskTitle: "랜딩페이지 만들기",
    taskDescription: "핵심 메시지부터 CTA까지, 전환 흐름을 먼저 잡아볼게요",
    jittoMessage: "먼저 흐름을 잡고, 그다음 도구를 고르면 쉬워요",
    steps: [
      { title: "핵심 메시지/타깃 정리", toolIds: ["tool_chatgpt"], primaryToolId: "tool_chatgpt" },
      { title: "구성(섹션)과 카피 초안", toolIds: ["tool_chatgpt", "tool_notion"], primaryToolId: "tool_chatgpt" },
      { title: "UI 설계 및 시각화", toolIds: ["tool_figma"], primaryToolId: "tool_figma" },
      { title: "구현 및 배포", toolIds: ["tool_cursor", "tool_vercel"], primaryToolId: "tool_cursor" },
    ],
  },
  lecture: {
    taskType: "lecture",
    taskTitle: "강의 준비하기",
    taskDescription: "목차와 학습 흐름을 기준으로 자료부터 차근차근 쌓아볼게요",
    jittoMessage: "방향을 정하면, 자료 정리가 빨라져요",
    steps: [
      {
        title: "주제와 학습 목표 정리",
        description: "강의가 끝났을 때 수강생이 무엇을 할 수 있어야 하는지 목표를 정해요.",
        toolIds: ["tool_chatgpt"],
        primaryToolId: "tool_chatgpt",
        tips: ["목표는 ‘~할 수 있다’ 형태로 3개 이내가 좋아요."],
      },
      {
        title: "자료 조사와 레퍼런스 수집",
        description: "핵심 개념을 뒷받침할 자료와 사례를 모으고 출처를 정리해요.",
        toolIds: ["tool_perplexity", "tool_inspiration_vault"],
        primaryToolId: "tool_perplexity",
        tips: ["레퍼런스는 ‘개념/사례/실습’ 3종류로 나누면 정리가 쉬워요."],
      },
      {
        title: "슬라이드 구조 설계",
        description: "도입→개념→데모→실습→정리 순으로 슬라이드 뼈대를 만들어요.",
        toolIds: ["tool_figma", "tool_make"],
        primaryToolId: "tool_figma",
        tips: ["한 슬라이드는 한 메시지만 담아보세요."],
      },
      {
        title: "대본 및 실습 흐름 정리",
        description: "말로 설명할 흐름과 실습 단계(체크포인트 포함)를 문서화해요.",
        toolIds: ["tool_chatgpt", "tool_notion"],
        primaryToolId: "tool_chatgpt",
        tips: ["실습은 ‘성공 기준’과 ‘막히는 포인트’까지 같이 적어두면 진행이 편해요."],
      },
    ],
  },
  "ui-design": {
    taskType: "ui-design",
    taskTitle: "UI 디자인하기",
    taskDescription: "레퍼런스 → 구조 → 컴포넌트 순서로 빠르게 정리해볼게요",
    jittoMessage: "레퍼런스랑 구조를 같이 보면 더 빨라요",
    steps: [
      { title: "레퍼런스 수집", toolIds: ["tool_inspiration_vault"], primaryToolId: "tool_inspiration_vault" },
      { title: "화면 구조/흐름 설계", toolIds: ["tool_figma"], primaryToolId: "tool_figma" },
      { title: "UI 디테일/카피 보강", toolIds: ["tool_chatgpt"], primaryToolId: "tool_chatgpt" },
      { title: "구현 핸드오프", toolIds: ["tool_figma", "tool_cursor"], primaryToolId: "tool_figma" },
    ],
  },
  automation: {
    taskType: "automation",
    taskTitle: "자동화 만들기",
    taskDescription: "목표와 조건을 먼저 나누고, 연결을 설계해볼게요",
    jittoMessage: "자동화는 조건을 나누면 쉬워져요",
    steps: [
      { title: "목표/트리거/조건 정리", toolIds: ["tool_chatgpt"], primaryToolId: "tool_chatgpt" },
      { title: "자동화 플로우 설계", toolIds: ["tool_make", "tool_zapier"], primaryToolId: "tool_make" },
      { title: "연동/테스트", toolIds: ["tool_make", "tool_github"], primaryToolId: "tool_make" },
      { title: "운영/모니터링", toolIds: ["tool_zapier"], primaryToolId: "tool_zapier" },
    ],
  },
  ideation: {
    taskType: "ideation",
    taskTitle: "아이디어 탐색하기",
    taskDescription: "레퍼런스를 모으고, 방향을 정하면서 아이디어를 확장해볼게요",
    jittoMessage: "레퍼런스를 모으면서 확장해보세요",
    steps: [
      { title: "레퍼런스 탐색/수집", toolIds: ["tool_inspiration_vault", "tool_perplexity"], primaryToolId: "tool_inspiration_vault" },
      { title: "아이디어 발산", toolIds: ["tool_chatgpt"], primaryToolId: "tool_chatgpt" },
      { title: "우선순위/실행 계획", toolIds: ["tool_chatgpt", "tool_notion"], primaryToolId: "tool_chatgpt" },
    ],
  },
};

export function getRecommendation(taskType: string): RecommendationResult | null {
  const key = taskType.trim();
  return recommendationPresets[key] ?? null;
}

