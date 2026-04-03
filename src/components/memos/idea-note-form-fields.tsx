"use client";

import { useCallback, useState } from "react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/components/ui/cn";
import { WORKSPACE_MEMO_TEXTAREA_CLASS } from "@/components/workspace/WorkspaceLinksMemosSections";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { memoFolderCategoryKey } from "@/lib/memo-folders-store";
import type { IdeaNote, NoteStructureKey } from "@/lib/notes-store";
import {
  buildSectionSetsFromRawMetadata,
  emptySectionSets,
  newStructuredSectionId,
  presetLectureTargetSection,
  presetSectionByKey,
  resolveMemoPlanTemplateForForm,
  sectionSetsToStoredMetadata,
  type SectionsByTemplate,
  type StructuredMemoSection,
  type StructuredMemoTemplateKey,
} from "@/lib/structured-memo-sections";

export const TITLE_INPUT_CLASS =
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-100/90 focus-visible:ring-offset-0";

const SECTION_INPUT_CLASS =
  "min-h-8 w-full rounded-lg border border-zinc-200/80 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-100/90 focus-visible:ring-offset-0";

export type IdeaFormState = {
  title: string;
  content: string;
  folderId: string;
  planTemplate: NoteStructureKey;
  sectionSets: SectionsByTemplate;
};

export function emptyIdeaFormState(defaultFolderId: string): IdeaFormState {
  return {
    title: "",
    content: "",
    folderId: defaultFolderId,
    planTemplate: "강의",
    sectionSets: emptySectionSets(),
  };
}

export function noteToFormState(note: IdeaNote): IdeaFormState {
  const m = (note.metadata ?? {}) as Record<string, unknown>;
  return {
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    planTemplate: resolveMemoPlanTemplateForForm(m, note.category),
    sectionSets: buildSectionSetsFromRawMetadata(m),
  };
}

export function formMetadataFromState(form: IdeaFormState): IdeaNote["metadata"] {
  return sectionSetsToStoredMetadata(form.sectionSets, form.planTemplate) as IdeaNote["metadata"];
}

export function buildIdeaCopyText(form: IdeaFormState): string {
  const lines: string[] = [`제목:\n${form.title}`, `본문:\n${form.content}`];
  if (form.planTemplate === "일반") return lines.join("\n\n");
  const sections = form.sectionSets[form.planTemplate as StructuredMemoTemplateKey];
  for (const s of sections) {
    const head = [s.title, s.subtitle].filter(Boolean).join(" · ") || s.key;
    lines.push(`${head}:\n${s.value}`);
  }
  return lines.join("\n\n");
}

const GUIDE_SECTION_LABEL: Record<NoteStructureKey, string> = {
  MVP: "MVP 기획 (Lean Start)",
  강의: "강의 기획 (Curriculum)",
  소설: "소설 기획 (Plotting)",
  일반: "",
};

const PLAN_CHIPS: { key: NoteStructureKey; label: string }[] = [
  { key: "일반", label: "일반" },
  { key: "MVP", label: "MVP" },
  { key: "강의", label: "강의" },
  { key: "소설", label: "소설" },
];

const PRESET_ADD: Record<
  StructuredMemoTemplateKey,
  { presetKey: string; label: string }[]
> = {
  강의: [
    { presetKey: "target", label: "Target" },
    { presetKey: "goal", label: "Goal" },
    { presetKey: "curriculum", label: "Curriculum" },
    { presetKey: "assignment", label: "Assignment" },
  ],
  MVP: [
    { presetKey: "problem", label: "Problem" },
    { presetKey: "hypothesis", label: "Hypothesis" },
    { presetKey: "criticalExperience", label: "Experience" },
    { presetKey: "features", label: "Features" },
  ],
  소설: [
    { presetKey: "logline", label: "Logline" },
    { presetKey: "worldview", label: "Worldview" },
    { presetKey: "characters", label: "Characters" },
    { presetKey: "plot", label: "Plot" },
  ],
};

function emptyCustomSection(): StructuredMemoSection {
  return {
    id: newStructuredSectionId(),
    key: `custom_${Date.now().toString(16)}`,
    title: "",
    subtitle: "",
    description: "",
    value: "",
  };
}

const SECTION_CARD_SHELL =
  "rounded-lg border border-zinc-200/90 bg-white p-3 shadow-sm ring-0 outline-none";

function StructuredSectionCard({
  section,
  autoFocusTitle,
  onChange,
  onRemove,
  onTitleFocused,
}: {
  section: StructuredMemoSection;
  autoFocusTitle?: boolean;
  onChange: (patch: Partial<StructuredMemoSection>) => void;
  onRemove: () => void;
  onTitleFocused?: () => void;
}) {
  return (
    <div className={SECTION_CARD_SHELL}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              id={`memo-sec-title-${section.id}`}
              className={cn(SECTION_INPUT_CLASS, "min-w-[6rem] flex-1 font-semibold")}
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="섹션 제목"
              autoFocus={autoFocusTitle}
              onFocus={onTitleFocused}
            />
            <input
              className={cn(SECTION_INPUT_CLASS, "min-w-[6rem] flex-1 text-zinc-700")}
              value={section.subtitle}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="부제"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/80 focus-visible:ring-offset-0"
          aria-label="섹션 삭제"
        >
          삭제
        </button>
      </div>
      <input
        className={cn(SECTION_INPUT_CLASS, "mt-2 text-[11px] text-zinc-600")}
        value={section.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="섹션 설명(힌트)"
      />
      <div className="mt-2">
        <AutoResizeTextarea
          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
          minHeightPx={72}
          maxHeightPx={320}
          value={section.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="내용을 입력하세요…"
        />
      </div>
    </div>
  );
}

export function IdeaFormFields({
  memoFolders,
  form,
  setForm,
}: {
  memoFolders: DashboardFolderRecord[];
  form: IdeaFormState;
  setForm: (patch: Partial<IdeaFormState> | ((prev: IdeaFormState) => IdeaFormState)) => void;
}) {
  const templateKey = form.planTemplate === "일반" ? null : (form.planTemplate as StructuredMemoTemplateKey);

  const [focusTitleSectionId, setFocusTitleSectionId] = useState<string | null>(null);

  const onFolderPick = (folderId: string) => {
    setForm((prev) => ({ ...prev, folderId }));
  };

  const setPlanTemplate = (key: NoteStructureKey) => {
    setForm((prev) => ({ ...prev, planTemplate: key }));
  };

  const addCustomSection = useCallback(() => {
    if (!templateKey) return;
    const next = emptyCustomSection();
    setFocusTitleSectionId(next.id);
    setForm((prev) => ({
      ...prev,
      sectionSets: {
        ...prev.sectionSets,
        [templateKey]: [...prev.sectionSets[templateKey], next],
      },
    }));
  }, [setForm, templateKey]);

  const addPresetSection = useCallback(
    (presetKey: string) => {
      if (!templateKey) return;
      let created: StructuredMemoSection | null = null;
      if (templateKey === "강의" && presetKey === "target") {
        created = presetLectureTargetSection();
      } else {
        created = presetSectionByKey(templateKey, presetKey);
      }
      if (!created) return;
      setFocusTitleSectionId(created.id);
      setForm((prev) => ({
        ...prev,
        sectionSets: {
          ...prev.sectionSets,
          [templateKey]: [...prev.sectionSets[templateKey], created],
        },
      }));
    },
    [setForm, templateKey],
  );

  const removeSection = (tk: StructuredMemoTemplateKey, id: string) => {
    setForm((prev) => ({
      ...prev,
      sectionSets: {
        ...prev.sectionSets,
        [tk]: prev.sectionSets[tk].filter((s) => s.id !== id),
      },
    }));
  };

  const patchSection = (tk: StructuredMemoTemplateKey, id: string, patch: Partial<StructuredMemoSection>) => {
    setForm((prev) => ({
      ...prev,
      sectionSets: {
        ...prev.sectionSets,
        [tk]: prev.sectionSets[tk].map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
    }));
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-zinc-500">메모 폴더</label>
      <p className="-mt-2 text-[11px] leading-snug text-zinc-500">
        폴더는 메모 분류(category)입니다. 구조형 입력 양식은 아래「구조 템플릿」에서 고릅니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {memoFolders.map((f) => {
          const label = memoFolderCategoryKey(f);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFolderPick(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                form.folderId === f.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80",
              )}
            >
              {f.hidden ? `${label} (숨김)` : label}
            </button>
          );
        })}
      </div>

      <label className="block text-xs font-semibold text-zinc-500">구조 템플릿</label>
      <p className="-mt-2 text-[11px] leading-snug text-zinc-500">
        일반은 제목·자유 메모만 씁니다. MVP·강의·소설은 기본 섹션이 열리며, 블록을 추가하거나 삭제할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {PLAN_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setPlanTemplate(key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              form.planTemplate === key ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block text-xs font-semibold text-zinc-500">제목</label>
      <input
        className={cn(TITLE_INPUT_CLASS, "mt-1.5")}
        value={form.title}
        onChange={(e) => setForm({ title: e.target.value })}
        placeholder="한 줄로 요약"
      />

      {templateKey ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {GUIDE_SECTION_LABEL[form.planTemplate]}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_ADD[templateKey].map(({ presetKey, label }) => (
              <button
                key={presetKey}
                type="button"
                onClick={() => addPresetSection(presetKey)}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                + {label}
              </button>
            ))}
            <button
              type="button"
              onClick={addCustomSection}
              className="rounded-full border border-dashed border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:border-zinc-400"
            >
              + Custom
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {form.sectionSets[templateKey].map((section) => (
              <StructuredSectionCard
                key={section.id}
                section={section}
                autoFocusTitle={focusTitleSectionId === section.id}
                onChange={(patch) => patchSection(templateKey, section.id, patch)}
                onRemove={() => removeSection(templateKey, section.id)}
                onTitleFocused={() => setFocusTitleSectionId(null)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <label className="block text-xs font-semibold text-zinc-500">자유 메모</label>
      <AutoResizeTextarea
        className={cn(WORKSPACE_MEMO_TEXTAREA_CLASS, "mt-1.5 min-h-[100px]")}
        minHeightPx={100}
        maxHeightPx={320}
        value={form.content}
        onChange={(e) => setForm({ content: e.target.value })}
        placeholder="생각을 풀어 쓰기…"
      />
    </div>
  );
}
