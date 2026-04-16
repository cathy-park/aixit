export type StructuredMemoSection = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  description: string;
  value: string;
};

/** @deprecated 모든 구조형 템플릿(MVP, 강의, 소설)은 제거되었습니다. 일반형으로 대체됩니다. */
export type StructuredMemoTemplateKey = "일반";

export type SectionsByTemplate = Record<string, StructuredMemoSection[]>;

export const MEMO_PLAN_TEMPLATE_KEY = "memoPlanTemplate";

export function newStructuredSectionId(): string {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sec_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

/** 폴더/카테고리 라벨 → 구조 키 (항상 일반형 반환) */
export function structureTypeFromCategoryLabel(label: string): string {
  return "일반";
}

export function defaultSectionsForStructure(st: string): StructuredMemoSection[] {
  return [];
}

export function buildSectionSetsFromRawMetadata(m: Record<string, unknown>): SectionsByTemplate {
  return { 일반: [] };
}

export function sectionSetsToStoredMetadata(
  sectionSets: SectionsByTemplate,
  planTemplate: string,
): Record<string, unknown> {
  return { [MEMO_PLAN_TEMPLATE_KEY]: "일반" };
}

export function emptySectionSets(): SectionsByTemplate {
  return { 일반: [] };
}

export function resolveMemoPlanTemplateForForm(
  m: Record<string, unknown>,
  categoryLabel: string,
): string {
  return "일반";
}

export function inferMemoPlanTemplateForStorage(
  m: Record<string, unknown>,
  categoryLabel: string,
  sets: SectionsByTemplate,
): string {
  return "일반";
}

export function getEffectivePlanTemplate(metadata: Record<string, unknown>, categoryLabel: string): string {
  return "일반";
}

export function getSectionsForStructure(metadata: Record<string, unknown>, st: string): StructuredMemoSection[] {
  return [];
}

export function structuredSectionsToMemoBlocks(sections: StructuredMemoSection[]): { label: string; value: string }[] {
  return [];
}

export function structuredSectionsToStepTitlesAndBodies(
  sections: StructuredMemoSection[],
): { title: string; body: string }[] {
  return [];
}

/** 검색용: 기존 메타데이터 검색 호환성 유지 (내용 있는 경우만) */
export function metadataAllSectionsSearchText(m: Record<string, unknown>): string {
  return "";
}
