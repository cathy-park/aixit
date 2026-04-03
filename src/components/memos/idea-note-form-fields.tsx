"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/components/ui/cn";
import { WORKSPACE_MEMO_TEXTAREA_CLASS } from "@/components/workspace/WorkspaceLinksMemosSections";
import { MemoMiniMarkupText } from "@/components/workspace/MemoMiniMarkupText";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { memoFolderCategoryKey } from "@/lib/memo-folders-store";
import { StatusChip } from "@/components/dashboard/WorkflowCard";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { normalizeIdeaNoteTags, type IdeaNote, type NoteStructureKey } from "@/lib/notes-store";
import {
  buildSectionSetsFromRawMetadata,
  emptySectionSets,
  getEffectivePlanTemplate,
  getSectionsForStructure,
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

/** 메모 모달 상단 폴더·구조 템플릿 드롭다운 공통 */
const MEMO_FORM_SELECT_CLASS =
  "h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[13px] text-zinc-900 outline-none focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-100/90 focus-visible:ring-offset-0";

export type IdeaFormState = {
  title: string;
  content: string;
  folderId: string;
  planTemplate: NoteStructureKey;
  /** 사용자 태그 (저장 시 정규화; 폴더명 태그와 별도) */
  tags: string[];
  sectionSets: SectionsByTemplate;
};

export function emptyIdeaFormState(defaultFolderId: string): IdeaFormState {
  return {
    title: "",
    content: "",
    folderId: defaultFolderId,
    planTemplate: "강의",
    tags: [],
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
    tags: [...note.tags],
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
  if (form.tags.length > 0) {
    lines.push(`태그:\n${form.tags.map((t) => `#${t}`).join("  ")}`);
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
          placeholder="내용… **굵게** *기울임* %%얇게%%"
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
  const [tagDraft, setTagDraft] = useState("");
  /** 한글 IME 등 조합 중에는 Enter/쉼표로 태그 확정 금지 */
  const tagImeComposingRef = useRef(false);
  /** 동일 문자열이 짧은 간격으로 두 번 커밋되는 경우 방지 (일부 브라우저 이중 keydown) */
  const lastTagCommitRef = useRef<{ norm: string; at: number }>({ norm: "", at: 0 });

  const commitTagValue = useCallback(
    (rawInput: string) => {
      const raw = rawInput.trim().replace(/,+$/u, "").trim();
      if (!raw) return;
      const t = raw.replace(/^#+/u, "").trim();
      if (!t) return;
      const norm = normalizeKeyword(t);
      const now = Date.now();
      if (lastTagCommitRef.current.norm === norm && now - lastTagCommitRef.current.at < 400) {
        return;
      }
      let added = false;
      setForm((prev) => {
        if (prev.tags.some((x) => normalizeKeyword(x) === norm)) return prev;
        added = true;
        return { ...prev, tags: normalizeIdeaNoteTags([...prev.tags, t]) };
      });
      if (added) {
        lastTagCommitRef.current = { norm, at: now };
        setTagDraft("");
      }
    },
    [setForm],
  );

  const tagInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const ne = e.nativeEvent;
      if (ne.isComposing || tagImeComposingRef.current || ne.keyCode === 229) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        commitTagValue(e.currentTarget.value);
        return;
      }
      if (e.key === ",") {
        e.preventDefault();
        commitTagValue(e.currentTarget.value.replace(/,+$/u, "").trim());
      }
    },
    [commitTagValue],
  );

  const removeTag = useCallback(
    (tag: string) => {
      setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== tag) }));
    },
    [setForm],
  );

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
      <div className="space-y-1.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1 basis-full sm:min-w-[10rem] sm:basis-0 sm:flex-1">
            <label htmlFor="idea-memo-folder-select" className="block text-xs font-semibold text-zinc-500">
              메모 폴더
            </label>
            <select
              id="idea-memo-folder-select"
              className={cn(MEMO_FORM_SELECT_CLASS, "mt-1")}
              value={memoFolders.some((f) => f.id === form.folderId) ? form.folderId : memoFolders[0]?.id ?? ""}
              onChange={(e) => onFolderPick(e.target.value)}
            >
              {memoFolders.map((f) => {
                const label = memoFolderCategoryKey(f);
                return (
                  <option key={f.id} value={f.id}>
                    {f.hidden ? `${label} (숨김)` : label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="min-w-0 flex-1 basis-full sm:min-w-[10rem] sm:basis-0 sm:flex-1">
            <label htmlFor="idea-plan-template-select" className="block text-xs font-semibold text-zinc-500">
              구조 템플릿
            </label>
            <select
              id="idea-plan-template-select"
              className={cn(MEMO_FORM_SELECT_CLASS, "mt-1")}
              value={form.planTemplate}
              onChange={(e) => setPlanTemplate(e.target.value as NoteStructureKey)}
            >
              {PLAN_CHIPS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-zinc-500">
          폴더는 분류, 템플릿은 입력 양식입니다. 일반은 자유 메모만, MVP·강의·소설은 구조형 섹션을 씁니다.
        </p>
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
        placeholder="생각을 풀어 쓰기… **굵게** *기울임* %%얇게%%"
      />

      <div className="space-y-1.5">
        <label htmlFor="idea-memo-tag-input" className="block text-xs font-semibold text-zinc-500">
          태그
        </label>
        <p className="text-[11px] leading-snug text-zinc-500">
          폴더명은 카드에 자동 표시됩니다. Enter 또는 쉼표(,)로 태그를 추가하세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {form.tags.map((tag) => (
            <span
              key={tag}
              className="group inline-flex max-w-full items-center gap-0.5 rounded-full bg-zinc-100 py-0.5 pl-2.5 pr-0.5 text-[11px] font-bold text-zinc-800 ring-1 ring-zinc-200/90"
            >
              <span className="min-w-0 truncate">#{tag}</span>
              <button
                type="button"
                className="shrink-0 rounded-full p-0.5 text-zinc-500 opacity-70 transition hover:bg-zinc-200/80 hover:text-zinc-800 hover:opacity-100"
                aria-label={`${tag} 태그 제거`}
                title="삭제"
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          id="idea-memo-tag-input"
          className={cn(TITLE_INPUT_CLASS, "mt-0")}
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onCompositionStart={() => {
            tagImeComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            tagImeComposingRef.current = false;
          }}
          onKeyDown={tagInputKeyDown}
          placeholder="태그 입력 후 Enter 또는 ,"
          maxLength={52}
        />
      </div>
    </div>
  );
}

const READONLY_SECTION_SHELL =
  "rounded-lg border border-zinc-200/90 bg-white p-3 shadow-sm";

/** 메모 카드 뷰어: 입력 컨트롤 없이 저장된 노트만 표시 */
export function IdeaMemoReadOnlyPanel({
  note,
  memoFolders,
}: {
  note: IdeaNote;
  memoFolders: DashboardFolderRecord[];
}) {
  const meta = (note.metadata ?? {}) as Record<string, unknown>;
  const folder = memoFolders.find((f) => f.id === note.folderId);
  const folderDisplay = folder ? memoFolderCategoryKey(folder) : note.category;
  const planKey = getEffectivePlanTemplate(meta, note.category) as NoteStructureKey;
  const planLabel = PLAN_CHIPS.find((p) => p.key === planKey)?.label ?? planKey;
  const templateKey = planKey === "일반" ? null : (planKey as StructuredMemoTemplateKey);
  const sections = templateKey ? getSectionsForStructure(meta, planKey) : [];

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 gap-y-2 border-b border-zinc-100 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
          <span className="font-semibold text-zinc-500">폴더</span>
          {folder ? (
            <FolderGlyph folder={folder} size="sm" className="shrink-0" accentColor={folder.color} />
          ) : null}
          <span className="font-semibold text-zinc-900">#{folderDisplay}</span>
        </div>
        <span className="hidden text-zinc-300 sm:inline" aria-hidden>
          ·
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-zinc-500">템플릿</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-800 ring-1 ring-zinc-200/90">
            {planLabel}
          </span>
        </div>
        <StatusChip status={note.projectStatus ?? "waiting"} />
      </div>

      <div>
        <div className="text-xs font-semibold text-zinc-500">제목</div>
        <div className="mt-1.5 text-base font-semibold leading-snug text-zinc-950">
          {note.title.trim() || "제목 없음"}
        </div>
      </div>

      {templateKey ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {GUIDE_SECTION_LABEL[planKey]}
          </p>
          <div className="mt-3 space-y-3">
            {sections.length === 0 ? (
              <p className="text-xs text-zinc-500">구조형 섹션이 없습니다.</p>
            ) : (
              sections.map((s) => (
                <div key={s.id} className={READONLY_SECTION_SHELL}>
                  <div className="text-xs font-semibold text-zinc-900">
                    {[s.title, s.subtitle].filter(Boolean).join(" · ") || s.key}
                  </div>
                  {s.description?.trim() ? (
                    <div className="mt-1 text-[11px] leading-snug text-zinc-500">{s.description}</div>
                  ) : null}
                  <div className="mt-2 text-sm font-medium leading-snug text-zinc-700">
                    {s.value.trim() ? <MemoMiniMarkupText text={s.value} /> : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-xs font-semibold text-zinc-500">자유 메모</div>
        <div className="mt-1.5 text-sm font-medium leading-snug text-zinc-700">
          {note.content?.trim() ? <MemoMiniMarkupText text={note.content} /> : "—"}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-zinc-500">태그</div>
        {note.tags.length === 0 ? (
          <p className="mt-1.5 text-xs text-zinc-400">태그 없음</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
                  keywordTagToneClass(normalizeKeyword(tag)),
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
