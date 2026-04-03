"use client";

import type { DragEvent } from "react";
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
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

const SECTION_INPUT_CLASS =
  "min-h-8 w-full rounded-lg border border-zinc-200/80 bg-white px-2 py-1 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

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

function moveSectionBefore(
  list: StructuredMemoSection[],
  fromId: string,
  beforeId: string,
): StructuredMemoSection[] {
  if (fromId === beforeId) return list;
  const fromIdx = list.findIndex((s) => s.id === fromId);
  const beforeIdx = list.findIndex((s) => s.id === beforeId);
  if (fromIdx < 0 || beforeIdx < 0) return list;
  const copy = [...list];
  const [item] = copy.splice(fromIdx, 1);
  const b = copy.findIndex((s) => s.id === beforeId);
  copy.splice(b, 0, item);
  return copy;
}

function moveSectionToEnd(list: StructuredMemoSection[], fromId: string): StructuredMemoSection[] {
  const fromIdx = list.findIndex((s) => s.id === fromId);
  if (fromIdx < 0) return list;
  const copy = [...list];
  const [item] = copy.splice(fromIdx, 1);
  copy.push(item);
  return copy;
}

function StructuredSectionCard({
  section,
  highlight,
  autoFocusTitle,
  onChange,
  onRemove,
  onTitleFocused,
  draggable,
  onGripDragStart,
  onGripDragEnd,
  onCardDragOver,
  onCardDrop,
}: {
  section: StructuredMemoSection;
  highlight?: boolean;
  autoFocusTitle?: boolean;
  onChange: (patch: Partial<StructuredMemoSection>) => void;
  onRemove: () => void;
  onTitleFocused?: () => void;
  draggable: boolean;
  onGripDragStart: () => void;
  onGripDragEnd: () => void;
  onCardDragOver: (e: DragEvent) => void;
  onCardDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      className={cn(
        highlight &&
          "rounded-lg border-2 border-zinc-900 bg-white p-3 shadow-sm ring-2 ring-zinc-900/10",
        !highlight && "rounded-lg border border-zinc-200/90 bg-white p-3",
      )}
      onDragOver={onCardDragOver}
      onDrop={onCardDrop}
    >
      <div className="flex items-start justify-between gap-2">
        {draggable ? (
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", section.id);
              onGripDragStart();
            }}
            onDragEnd={onGripDragEnd}
            className="mt-1 shrink-0 cursor-grab touch-none rounded px-1 py-0.5 text-zinc-400 hover:bg-zinc-100 active:cursor-grabbing"
            aria-label="섹션 순서 변경(드래그)"
            title="드래그하여 순서 변경"
          >
            <span className="block text-[10px] leading-none tracking-tighter">⋮⋮</span>
          </button>
        ) : null}
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
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 transition hover:bg-rose-50 hover:text-rose-700"
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
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

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

  const applyReorder = useCallback(
    (tk: StructuredMemoTemplateKey, fromId: string, beforeId: string | "end") => {
      if (fromId === beforeId) return;
      setForm((prev) => {
        const list = prev.sectionSets[tk];
        const next =
          beforeId === "end" ? moveSectionToEnd(list, fromId) : moveSectionBefore(list, fromId, beforeId);
        return {
          ...prev,
          sectionSets: { ...prev.sectionSets, [tk]: next },
        };
      });
    },
    [setForm],
  );

  const onSectionCardDrop = useCallback(
    (e: DragEvent, beforeSectionId: string) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain") || draggingSectionId;
      if (!fromId || !templateKey) return;
      applyReorder(templateKey, fromId, beforeSectionId);
      setDraggingSectionId(null);
    },
    [applyReorder, draggingSectionId, templateKey],
  );

  const onListEndDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain") || draggingSectionId;
      if (!fromId || !templateKey) return;
      applyReorder(templateKey, fromId, "end");
      setDraggingSectionId(null);
    },
    [applyReorder, draggingSectionId, templateKey],
  );

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
        일반은 제목·자유 메모만 씁니다. MVP·강의·소설은 해당 기본 섹션이 열리며, 블록을 더하거나 빼거나 순서를 바꿀 수 있습니다.
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

      <label className="block text-xs font-semibold text-zinc-500">자유 메모</label>
      <AutoResizeTextarea
        className={cn(WORKSPACE_MEMO_TEXTAREA_CLASS, "mt-1.5 min-h-[100px]")}
        minHeightPx={100}
        value={form.content}
        onChange={(e) => setForm({ content: e.target.value })}
        placeholder="생각을 풀어 쓰기…"
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
            {form.sectionSets[templateKey].map((section, idx) => (
              <StructuredSectionCard
                key={section.id}
                section={section}
                highlight={idx === 0 && form.planTemplate === "MVP"}
                autoFocusTitle={focusTitleSectionId === section.id}
                draggable
                onGripDragStart={() => setDraggingSectionId(section.id)}
                onGripDragEnd={() => setDraggingSectionId(null)}
                onCardDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onCardDrop={(e) => onSectionCardDrop(e, section.id)}
                onChange={(patch) => patchSection(templateKey, section.id, patch)}
                onRemove={() => removeSection(templateKey, section.id)}
                onTitleFocused={() => setFocusTitleSectionId(null)}
              />
            ))}
          </div>

          {form.sectionSets[templateKey].length > 0 ? (
            <div
              className="mt-2 min-h-[2rem] rounded-lg border border-dashed border-transparent text-center text-[11px] text-zinc-400 transition hover:border-zinc-300 hover:bg-white/60"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={onListEndDrop}
            >
              <span className="inline-block py-2">여기에 놓으면 맨 아래로 이동</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
