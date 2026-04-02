/**
 * AIXIT – Tool Vault (layer 1)
 *
 * Stores AI tools and their capabilities.
 * Workflow Builder (layer 3) can compose ordered workflows via `recommendWorkflow`.
 */

export type ToolCapability =
  | "planning"
  | "copywriting"
  | "ui-design"
  | "coding"
  | "research"
  | "automation"
  | "image-generation";

export type ToolDifficulty = "easy" | "medium" | "hard";

export type ToolCardTagVariant = "blue" | "purple" | "green";

/** 계정 배지(로고 우하단) + 팝업 상세 — email 은 이메일·일반 아이디 */
export type CredentialProviderId =
  | "email"
  | "google"
  | "kakao"
  | "naver"
  | "apple"
  | "facebook"
  | "github"
  | "ddokdi"
  | "x";

export type ToolCredential = {
  /** tool 내부에서의 식별자 */
  id: string;
  provider: CredentialProviderId;
  /** 이메일/아이디 */
  loginId?: string;
  /** 비밀번호/API key 등 */
  secret?: string;
  /** 사용자가 알아보기 쉬운 별칭 (예: 회사계정, 개인계정) */
  label?: string;
};

export type Tool = {
  id: string;
  name: string;
  category: string;
  capabilities: ToolCapability[];
  difficulty: ToolDifficulty;
  recommendedFor: string[];
  active: boolean;
  /**
   * 창고에서 사용자가 끈 경우. true이면 `active`(카탈로그/결제)와 무관하게,
   * 프로젝트에 연결돼 있어도 비활성 UI·기능 차단(우선순위 최상).
   */
  userDisabled?: boolean;
  description?: string;
  tags?: string[];
  href?: string;
  logoText?: string; // fallback "logo" (e.g. GPT, Fi)
  /** 카드 상단 구독/요금 배지 (예: 💳 구독 $20/월) */
  subscriptionLabel?: string;
  /** 노란 강조 노트 */
  highlightNote?: string;
  /** 계정 목록 (여러 개 가능) */
  credentials?: ToolCredential[];
  /** 대표(활성) 계정 */
  activeCredentialId?: string;
  /** (레거시) 계정 정보 (단일) */
  credentialId?: string;
  credentialSecret?: string;
  /** 설정 시 카드에는 해당 로고만, 탭하면 아이디·비밀번호 팝업 */
  credentialProvider?: CredentialProviderId;
  /** 푸터 옆 사용 횟수 */
  usageCount?: number;
  /** 컬러 태그 (없으면 tags 문자열 사용) */
  cardTags?: Array<{ label: string; variant: ToolCardTagVariant }>;
  /** 카드 헤더 아바타 영역에 적용할 Tailwind 클래스 (기본: 어두운 배경) */
  cardAvatarClassName?: string;
  /** 커스텀 로고 이미지 URL (있으면 아바타에 표시) */
  logoImageUrl?: string;
  /** 로고 영역 배경색 (hex, 예: #10A37F) */
  avatarBackgroundColor?: string;
};

/** 프로젝트·피커·창고 공통: 실제로 쓸 수 있는 활성 여부 */
export function isToolEffectivelyActive(tool: Tool): boolean {
  if (tool.userDisabled === true) return false;
  return tool.active !== false;
}

export const tools: Tool[] = [
  {
    id: "tool_claude",
    name: "Claude",
    category: "LLM",
    capabilities: ["planning", "copywriting", "research"],
    difficulty: "easy",
    recommendedFor: ["spec writing", "summaries", "requirements", "decision memos"],
    active: true,
    description: "기획/정리/문서화를 빠르게 도와주는 대화형 모델",
    tags: ["planning", "research"],
    href: "https://claude.ai",
    logoText: "C",
  },
  {
    id: "tool_chatgpt",
    name: "ChatGPT",
    category: "LLM",
    capabilities: ["planning", "copywriting", "research", "coding"],
    difficulty: "easy",
    recommendedFor: ["drafting", "ideation", "code help", "explanations"],
    active: true,
    description: "OpenAI의 대화형 AI",
    tags: ["planning", "copywriting", "coding"],
    href: "https://chat.openai.com",
    logoText: "GPT",
    subscriptionLabel: "💳 구독 $20/월",
    highlightNote: "코드 리뷰할 때 제일 정확함, GPT-4 모델 사용 중",
    credentialId: "myemail@example.com",
    credentialSecret: "••••••••••",
    usageCount: 142,
    cardTags: [
      { label: "#로그인구현", variant: "blue" },
      { label: "#챗봇", variant: "purple" },
      { label: "#필수도구", variant: "green" },
    ],
  },
  {
    id: "tool_perplexity",
    name: "Perplexity",
    category: "Research",
    capabilities: ["research"],
    difficulty: "easy",
    recommendedFor: ["web research", "source discovery", "fact checking"],
    active: true,
    description: "빠른 자료 조사와 출처 확인에 강한 검색형 도구",
    tags: ["research"],
    href: "https://www.perplexity.ai",
    logoText: "P",
  },
  {
    id: "tool_figma",
    name: "Figma",
    category: "Design",
    capabilities: ["ui-design", "planning"],
    difficulty: "medium",
    recommendedFor: ["wireframes", "UI specs", "handoff"],
    active: true,
    description: "UI 설계/프로토타입/컴포넌트 관리",
    tags: ["ui-design"],
    href: "https://figma.com",
    logoText: "Fi",
  },
  {
    id: "tool_cursor",
    name: "Cursor",
    category: "IDE",
    capabilities: ["coding", "planning"],
    difficulty: "medium",
    recommendedFor: ["implementation", "refactors", "debugging"],
    active: true,
    description: "AI와 함께 구현/리팩터링을 빠르게 진행하는 IDE",
    tags: ["coding"],
    href: "https://cursor.com",
    logoText: "Cu",
  },
  {
    id: "tool_github",
    name: "GitHub",
    category: "DevOps",
    capabilities: ["automation", "coding"],
    difficulty: "medium",
    recommendedFor: ["PR review", "CI checks", "issue tracking"],
    active: true,
    description: "코드 협업, 이슈/PR, 자동화(CI) 관리",
    tags: ["automation", "coding"],
    href: "https://github.com",
    logoText: "GH",
  },
  {
    id: "tool_vercel",
    name: "Vercel",
    category: "Deployment",
    capabilities: ["automation", "coding"],
    difficulty: "easy",
    recommendedFor: ["preview deploys", "production deploys"],
    active: true,
    description: "프론트엔드 배포/프리뷰/모니터링",
    tags: ["deployment"],
    href: "https://vercel.com",
    logoText: "V",
  },
  {
    id: "tool_zapier",
    name: "Zapier",
    category: "Automation",
    capabilities: ["automation"],
    difficulty: "easy",
    recommendedFor: ["notifications", "CRM sync", "no-code workflows"],
    active: true,
    description: "노코드 자동화로 앱들을 빠르게 연결",
    tags: ["automation"],
    href: "https://zapier.com",
    logoText: "Z",
  },
  {
    id: "tool_make",
    name: "Make",
    category: "Automation",
    capabilities: ["automation"],
    difficulty: "medium",
    recommendedFor: ["complex automations", "multi-step integrations"],
    active: true,
    description: "복잡한 멀티스텝 자동화/시나리오 설계",
    tags: ["automation"],
    href: "https://www.make.com",
    logoText: "M",
  },
  {
    id: "tool_midjourney",
    name: "Midjourney",
    category: "Image",
    capabilities: ["image-generation"],
    difficulty: "medium",
    recommendedFor: ["concept art", "marketing visuals", "style exploration"],
    active: true,
    description: "컨셉/마케팅 비주얼 생성에 강한 이미지 도구",
    tags: ["image-generation"],
    href: "https://www.midjourney.com",
    logoText: "MJ",
  },
  {
    id: "tool_sd",
    name: "Stable Diffusion",
    category: "Image",
    capabilities: ["image-generation"],
    difficulty: "hard",
    recommendedFor: ["local generation", "control nets", "batch renders"],
    active: false,
    description: "로컬 이미지 생성/컨트롤넷 등 고급 커스터마이징",
    tags: ["image-generation"],
    href: "https://stability.ai",
    logoText: "SD",
  },
  {
    id: "tool_relume",
    name: "Relume",
    category: "Web Builder",
    capabilities: ["planning", "ui-design"],
    difficulty: "easy",
    recommendedFor: ["site map", "wireframe", "component suggestions"],
    active: true,
    description: "사이트 구조/와이어프레임을 빠르게 잡는 웹 빌더",
    tags: ["ui-design", "planning"],
    href: "https://www.relume.io",
    logoText: "R",
  },
  {
    id: "tool_replit",
    name: "Replit",
    category: "IDE",
    capabilities: ["coding", "automation"],
    difficulty: "easy",
    recommendedFor: ["quick prototypes", "deployable demos"],
    active: true,
    description: "브라우저에서 바로 코딩/실행/공유하는 개발 환경",
    tags: ["coding"],
    href: "https://replit.com",
    logoText: "Re",
  },
  {
    id: "tool_notion",
    name: "Notion",
    category: "Docs",
    capabilities: ["planning", "copywriting"],
    difficulty: "easy",
    recommendedFor: ["outlines", "docs", "checklists"],
    active: true,
    description: "문서/목차/체크리스트 정리에 좋은 워크스페이스",
    tags: ["planning", "docs"],
    href: "https://www.notion.so",
    logoText: "N",
  },
  {
    id: "tool_inspiration_vault",
    name: "영감창고",
    category: "Inspiration Vault",
    capabilities: ["research", "planning"],
    difficulty: "easy",
    recommendedFor: ["reference collection", "moodboards"],
    active: true,
    description: "레퍼런스 웹사이트를 모으고 분류하는 AIXIT 보관함",
    tags: ["inspiration", "research"],
    href: "/",
    logoText: "💡",
  },
];

const CAPABILITY_LABEL_KO: Record<ToolCapability, string> = {
  planning: "기획",
  copywriting: "카피라이팅",
  "ui-design": "UI 디자인",
  coding: "코딩",
  research: "리서치",
  automation: "자동화",
  "image-generation": "이미지 생성",
};

/** 도구 추가·수정 폼에서만 선택 가능한 태그(자유 입력 없음) */
export const TOOL_TAG_PRESETS: readonly string[] = Array.from(
  new Set([...tools.flatMap((t) => t.tags ?? []), ...Object.values(CAPABILITY_LABEL_KO)]),
).sort((a, b) => a.localeCompare(b, "ko"));

type TaskProfile = {
  include: ToolCapability[];
  niceToHave?: ToolCapability[];
  exclude?: ToolCapability[];
  maxDifficulty?: ToolDifficulty;
};

const difficultyRank: Record<ToolDifficulty, number> = { easy: 0, medium: 1, hard: 2 };

function normalizeTaskType(taskType: string) {
  return taskType.trim().toLowerCase().replace(/\s+/g, "-");
}

function profileFor(taskType: string): TaskProfile {
  const t = normalizeTaskType(taskType);

  // You can expand this mapping as AIXIT learns from usage.
  if (["ui", "ui-design", "design", "product-design"].includes(t)) {
    return { include: ["planning", "ui-design", "copywriting"], niceToHave: ["research", "image-generation"], maxDifficulty: "medium" };
  }
  if (["coding", "implementation", "frontend", "backend"].includes(t)) {
    return { include: ["planning", "coding"], niceToHave: ["research", "automation"], maxDifficulty: "hard" };
  }
  if (["research", "market-research", "competitor-research"].includes(t)) {
    return { include: ["research", "planning"], niceToHave: ["copywriting"], maxDifficulty: "medium" };
  }
  if (["automation", "ops", "workflow-automation"].includes(t)) {
    return { include: ["automation", "planning"], niceToHave: ["coding"], maxDifficulty: "medium" };
  }
  if (["copy", "copywriting", "content", "marketing"].includes(t)) {
    return { include: ["copywriting", "planning"], niceToHave: ["research", "image-generation"], maxDifficulty: "medium" };
  }
  if (["image", "image-generation", "visuals"].includes(t)) {
    return { include: ["image-generation", "planning"], niceToHave: ["copywriting"], maxDifficulty: "hard" };
  }

  // Default: balanced.
  return { include: ["planning"], niceToHave: ["research", "copywriting", "coding"], maxDifficulty: "medium" };
}

function scoreTool(tool: Tool, profile: TaskProfile) {
  if (!isToolEffectivelyActive(tool)) return -Infinity;
  if (profile.maxDifficulty && difficultyRank[tool.difficulty] > difficultyRank[profile.maxDifficulty]) return -Infinity;
  if (profile.exclude?.some((c) => tool.capabilities.includes(c))) return -Infinity;

  let score = 0;

  // Prefer tools that cover required capabilities.
  for (const c of profile.include) {
    if (tool.capabilities.includes(c)) score += 6;
  }
  // Add gentle boost for nice-to-have.
  for (const c of profile.niceToHave ?? []) {
    if (tool.capabilities.includes(c)) score += 2;
  }

  // Prefer easier tools when scores tie.
  score -= difficultyRank[tool.difficulty] * 0.5;

  return score;
}

/**
 * Workflow Builder (layer 3)
 *
 * Returns a recommended ordered list of tools for a given `taskType`.
 * - Filters to active tools
 * - Scores by capability fit
 * - Orders deterministically (score desc, then name asc)
 */
export function recommendWorkflow(taskType: string): Tool[] {
  const profile = profileFor(taskType);
  const ranked = tools
    .map((tool) => ({ tool, score: scoreTool(tool, profile) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.tool.name.localeCompare(b.tool.name);
    })
    .map((x) => x.tool);

  // Ensure we always return a usable "starter" chain:
  // - planning-first (LLM)
  // - then specialized tools
  // If the ranking already has them, keep order; otherwise, prepend.
  const ensure: string[] = [];
  if (!ranked.some((t) => t.capabilities.includes("planning"))) ensure.push("tool_claude");
  if (profile.include.includes("coding") && !ranked.some((t) => t.capabilities.includes("coding"))) ensure.push("tool_cursor");
  if (profile.include.includes("ui-design") && !ranked.some((t) => t.capabilities.includes("ui-design"))) ensure.push("tool_figma");
  if (profile.include.includes("automation") && !ranked.some((t) => t.capabilities.includes("automation"))) ensure.push("tool_zapier");

  const prepend = ensure
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t && isToolEffectivelyActive(t)));

  const merged: Tool[] = [];
  for (const t of [...prepend, ...ranked]) {
    if (!merged.some((x) => x.id === t.id)) merged.push(t);
  }

  // Keep the list concise (typical "ordered workflow" length).
  return merged.slice(0, 6);
}

