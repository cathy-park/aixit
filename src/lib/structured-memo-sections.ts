export type StructuredMemoTemplateKey = "MVP" | "강의" | "소설";

export type StructuredMemoSection = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  description: string;
  value: string;
};

export type SectionsByTemplate = Record<StructuredMemoTemplateKey, StructuredMemoSection[]>;

export const MEMO_PLAN_TEMPLATE_KEY = "memoPlanTemplate";

const TEMPLATE_KEYS: StructuredMemoTemplateKey[] = ["MVP", "강의", "소설"];

export function newStructuredSectionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sec_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function normalizeOne(raw: unknown, fallbackKey: string): StructuredMemoSection {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newStructuredSectionId();
  const key = typeof o.key === "string" && o.key.trim() ? o.key.trim() : fallbackKey;
  return {
    id,
    key,
    title: typeof o.title === "string" ? o.title : "",
    subtitle: typeof o.subtitle === "string" ? o.subtitle : "",
    description: typeof o.description === "string" ? o.description : "",
    value: typeof o.value === "string" ? o.value : "",
  };
}

/** 폴더/카테고리 라벨 → 구조 키 (memoPlanTemplate 미지정 시 보조) */
export function structureTypeFromCategoryLabel(label: string): StructuredMemoTemplateKey | "일반" {
  const t = label.trim();
  if (t === "MVP") return "MVP";
  if (t === "강의") return "강의";
  if (t === "소설") return "소설";
  return "일반";
}

function isMemoPlanTemplateValue(v: unknown): v is StructuredMemoTemplateKey | "일반" {
  return v === "MVP" || v === "강의" || v === "소설" || v === "일반";
}

export function defaultSectionsForStructure(st: StructuredMemoTemplateKey): StructuredMemoSection[] {
  switch (st) {
    case "MVP":
      return [
        {
          id: newStructuredSectionId(),
          key: "problem",
          title: "Problem",
          subtitle: "문제",
          description: "해결하려는 명확한 문제를 적습니다.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "hypothesis",
          title: "Hypothesis",
          subtitle: "가설",
          description: "검증 가능한 가설 문장으로 적습니다.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "criticalExperience",
          title: "Experience",
          subtitle: "핵심 경험",
          description: "사용자가 느낄 결정적 순간을 적습니다.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "features",
          title: "Features",
          subtitle: "최소 기능",
          description: "줄 단위로 최소 기능만 적습니다.",
          value: "",
        },
      ];
    case "강의":
      return [
        {
          id: newStructuredSectionId(),
          key: "goal",
          title: "Goal",
          subtitle: "수강생의 변화",
          description: "강의 후 달라질 모습.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "curriculum",
          title: "Curriculum",
          subtitle: "목차",
          description: "주차·차시별 목차.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "assignment",
          title: "Assignment",
          subtitle: "실습 과제",
          description: "줄 단위 과제.",
          value: "",
        },
      ];
    case "소설":
      return [
        {
          id: newStructuredSectionId(),
          key: "logline",
          title: "Logline",
          subtitle: "한 줄 요약",
          description: "이야기 한 줄.",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "worldview",
          title: "Worldview",
          subtitle: "세계관·규칙",
          description: "",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "characters",
          title: "Characters",
          subtitle: "결핍·목표",
          description: "",
          value: "",
        },
        {
          id: newStructuredSectionId(),
          key: "plot",
          title: "Plot",
          subtitle: "갈등·기승전결",
          description: "",
          value: "",
        },
      ];
    default:
      return [];
  }
}

/** 강의형 — Target 블록 (기본 3개엔 없음, 레거시·추가용) */
export function presetLectureTargetSection(): StructuredMemoSection {
  return {
    id: newStructuredSectionId(),
    key: "target",
    title: "Target",
    subtitle: "누구에게 무엇을",
    description: "대상·주제·범위.",
    value: "",
  };
}

export function presetSectionByKey(tk: StructuredMemoTemplateKey, key: string): StructuredMemoSection | null {
  const defs = defaultSectionsForStructure(tk);
  const hit = defs.find((s) => s.key === key);
  if (!hit) return null;
  return { ...hit, id: newStructuredSectionId(), value: "" };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mergeLegacyIntoSections(
  st: StructuredMemoTemplateKey,
  sections: StructuredMemoSection[],
  m: Record<string, unknown>,
): StructuredMemoSection[] {
  const byKey = new Map(sections.map((s) => [s.key, { ...s }]));
  if (st === "MVP") {
    const map: Record<string, string> = {
      problem: str(m.problem ?? m.problemDefinition),
      hypothesis: str(m.hypothesis ?? m.coreHypothesis),
      criticalExperience: str(m.criticalExperience ?? m.coreExperience),
      features: str(m.features ?? m.coreFeatures),
    };
    for (const [k, v] of Object.entries(map)) {
      const s = byKey.get(k);
      if (s && v) s.value = v;
    }
  } else if (st === "강의") {
    const map: Record<string, string> = {
      target: str(m.target ?? m.targetLearners),
      goal: str(m.goal ?? m.learningGoals),
      curriculum: str(m.curriculum ?? m.curriculumSummary),
      assignment: str(m.assignment),
    };
    for (const [k, v] of Object.entries(map)) {
      const s = byKey.get(k);
      if (s && v) s.value = v;
    }
  } else if (st === "소설") {
    const map: Record<string, string> = {
      logline: str(m.logline),
      worldview: str(m.worldview ?? m.worldbuildingNotes),
      characters: str(m.characters ?? m.characterSheet),
      plot: str(m.plot),
    };
    for (const [k, v] of Object.entries(map)) {
      const s = byKey.get(k);
      if (s && v) s.value = v;
    }
  }
  let out = sections.map((s) => byKey.get(s.key) ?? s);
  if (st === "강의") {
    const targetStr = str(m.target ?? m.targetLearners);
    if (targetStr && !out.some((s) => s.key === "target")) {
      const t = presetLectureTargetSection();
      t.value = targetStr;
      out = [t, ...out];
    }
  }
  return out;
}

function parseSectionsArray(raw: unknown): StructuredMemoSection[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((row, i) => normalizeOne(row, `custom_${i}`));
}

function readSectionsByTemplate(raw: Record<string, unknown>): Partial<Record<StructuredMemoTemplateKey, StructuredMemoSection[]>> | null {
  const st = raw.sectionsByTemplate;
  if (!st || typeof st !== "object" || Array.isArray(st)) return null;
  const o = st as Record<string, unknown>;
  const out: Partial<Record<StructuredMemoTemplateKey, StructuredMemoSection[]>> = {};
  for (const k of TEMPLATE_KEYS) {
    const arr = parseSectionsArray(o[k]);
    if (arr) out[k] = arr;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function buildSectionSetsFromRawMetadata(m: Record<string, unknown>): SectionsByTemplate {
  const fromStored = readSectionsByTemplate(m);
  const result = {} as SectionsByTemplate;
  for (const tk of TEMPLATE_KEYS) {
    let list = fromStored?.[tk];
    if (!list || list.length === 0) {
      list = defaultSectionsForStructure(tk);
      list = mergeLegacyIntoSections(tk, list, m);
    } else {
      list = list.map((s, i) => normalizeOne(s, s.key || `custom_${i}`));
      list = mergeLegacyIntoSections(tk, list, m);
    }
    result[tk] = list;
  }
  return result;
}

export function sectionSetsToStoredMetadata(
  sectionSets: SectionsByTemplate,
  planTemplate: StructuredMemoTemplateKey | "일반",
): Record<string, unknown> {
  return {
    sectionsByTemplate: {
      MVP: sectionSets.MVP,
      강의: sectionSets.강의,
      소설: sectionSets.소설,
    },
    [MEMO_PLAN_TEMPLATE_KEY]: planTemplate,
  };
}

export function emptySectionSets(): SectionsByTemplate {
  return {
    MVP: defaultSectionsForStructure("MVP"),
    강의: defaultSectionsForStructure("강의"),
    소설: defaultSectionsForStructure("소설"),
  };
}

/** 저장된 plan 또는 폴더명·섹션 내용으로 편집기에 쓸 템플릿 결정 */
export function resolveMemoPlanTemplateForForm(
  m: Record<string, unknown>,
  categoryLabel: string,
): StructuredMemoTemplateKey | "일반" {
  const raw = m[MEMO_PLAN_TEMPLATE_KEY];
  if (isMemoPlanTemplateValue(raw)) return raw;
  const fromFolder = structureTypeFromCategoryLabel(categoryLabel);
  if (fromFolder !== "일반") return fromFolder;
  const sets = buildSectionSetsFromRawMetadata(m);
  for (const tk of TEMPLATE_KEYS) {
    if (sets[tk].some((s) => s.value.trim())) return tk;
  }
  return "일반";
}

/** normalize 시 metadata에 넣을 plan 값 */
export function inferMemoPlanTemplateForStorage(
  m: Record<string, unknown>,
  categoryLabel: string,
  sets: SectionsByTemplate,
): StructuredMemoTemplateKey | "일반" {
  const raw = m[MEMO_PLAN_TEMPLATE_KEY];
  if (isMemoPlanTemplateValue(raw)) return raw;
  const fromFolder = structureTypeFromCategoryLabel(categoryLabel);
  if (fromFolder !== "일반") return fromFolder;
  for (const tk of TEMPLATE_KEYS) {
    if (sets[tk].some((s) => s.value.trim())) return tk;
  }
  return "일반";
}

export function getEffectivePlanTemplate(metadata: Record<string, unknown>, categoryLabel: string): string {
  return resolveMemoPlanTemplateForForm(metadata, categoryLabel);
}

export function getSectionsForStructure(metadata: Record<string, unknown>, st: string): StructuredMemoSection[] {
  if (st !== "MVP" && st !== "강의" && st !== "소설") return [];
  const sets = buildSectionSetsFromRawMetadata(metadata);
  return sets[st];
}

export function structuredSectionsToMemoBlocks(sections: StructuredMemoSection[]): { label: string; value: string }[] {
  return sections
    .filter((s) => s.value.trim())
    .map((s) => {
      const label = [s.title, s.subtitle].filter(Boolean).join(" · ") || s.key;
      return { label, value: s.value.trim() };
    });
}

export function structuredSectionsToStepTitlesAndBodies(
  sections: StructuredMemoSection[],
): { title: string; body: string }[] {
  return sections.map((s) => ({
    title: [s.title, s.subtitle].filter(Boolean).join(" · ") || s.key,
    body: s.value ?? "",
  }));
}

/** 검색용: 세 템플릿 섹션 전체 텍스트 */
export function metadataAllSectionsSearchText(m: Record<string, unknown>): string {
  const sets = buildSectionSetsFromRawMetadata(m);
  return TEMPLATE_KEYS.flatMap((tk) =>
    sets[tk].map((s) => `${s.title} ${s.subtitle} ${s.description} ${s.value}`),
  ).join(" ");
}
