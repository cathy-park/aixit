"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/components/ui/cn";
import { WORKSPACE_MEMO_TEXTAREA_CLASS } from "@/components/workspace/WorkspaceLinksMemosSections";
import { MemoMarkupBody } from "@/components/workspace/MemoMiniMarkupText";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { memoFolderCategoryKey } from "@/lib/memo-folders-store";
import { StatusChip } from "@/components/dashboard/WorkflowCard";
import { FolderGlyph } from "@/components/dashboard/FolderGlyph";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { normalizeIdeaNoteTags, type IdeaNote } from "@/lib/notes-store";
import { WORKFLOW_STATUS_OPTIONS, type WorkflowRunStatus } from "@/lib/workflow-run-status";
import {
  statusVisibilityPillClass,
  statusVisibilitySignalClass,
} from "@/lib/dashboard-status-visibility-styles";

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
  tags: string[];
  color: string;
  status: string;
};

export function emptyIdeaFormState(defaultFolderId: string): IdeaFormState {
  return {
    title: "",
    content: "",
    folderId: defaultFolderId,
    tags: [],
    color: "yellow",
    status: "준비중",
  };
}

export function noteToFormState(note: IdeaNote): IdeaFormState {
  return {
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    tags: [...note.tags],
    color: note.color || "yellow",
    status: note.projectStatus || "준비중",
  };
}

export function formMetadataFromState(form: IdeaFormState): IdeaNote["metadata"] {
  return {};
}

export function buildIdeaCopyText(form: IdeaFormState): string {
  const lines: string[] = [`제목:\n${form.title}`, `상태: ${form.status}`, `본문:\n${form.content}`];
  if (form.tags.length > 0) {
    lines.push(`태그:\n${form.tags.map((t) => `#${t}`).join("  ")}`);
  }
  return lines.join("\n\n");
}

function StatusPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {WORKFLOW_STATUS_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 transition hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
            statusVisibilityPillClass(s as WorkflowRunStatus, value === s),
          )}
        >
          <span
            className={cn("text-xs leading-none", statusVisibilitySignalClass(s as WorkflowRunStatus, value === s))}
            aria-hidden
          >
            ⏺
          </span>
          {s}
        </button>
      ))}
    </div>
  );
}

export const MEMO_COLORS = [
  { key: "yellow", bg: "bg-[#FFF9C4]", border: "border-[#FBC02D]", label: "노랑" },
  { key: "rose", bg: "bg-[#FCE4EC]", border: "border-[#F06292]", label: "분홍" },
  { key: "blue", bg: "bg-[#E3F2FD]", border: "border-[#64B5F6]", label: "파랑" },
  { key: "green", bg: "bg-[#E8F5E9]", border: "border-[#81C784]", label: "연두" },
  { key: "orange", bg: "bg-[#FFF3E0]", border: "border-[#FFB74D]", label: "주황" },
  { key: "purple", bg: "bg-[#F3E5F5]", border: "border-[#BA68C8]", label: "보라" },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {MEMO_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={cn(
            "group relative h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
            c.bg,
            "border",
            value === c.key ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200",
          )}
          title={c.label}
        >
          {value === c.key && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
            </span>
          )}
        </button>
      ))}
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
  const [tagDraft, setTagDraft] = useState("");
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentCaretRef = useRef({ start: 0, end: 0 });
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

  const insertIntoContent = useCallback(
    (snippet: string) => {
      setForm((prev) => {
        const cur = prev.content;
        const el = contentTextareaRef.current;
        let s = contentCaretRef.current.start;
        let e = contentCaretRef.current.end;
        if (el && document.activeElement === el) {
          s = el.selectionStart;
          e = el.selectionEnd;
        }
        s = Math.min(Math.max(0, s), cur.length);
        e = Math.min(Math.max(0, e), cur.length);
        const next = cur.slice(0, s) + snippet + cur.slice(e);
        requestAnimationFrame(() => {
          const ta = contentTextareaRef.current;
          if (!ta) return;
          const pos = s + snippet.length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
          contentCaretRef.current = { start: pos, end: pos };
        });
        return { ...prev, content: next };
      });
    },
    [setForm],
  );

  const onFolderPick = (folderId: string) => {
    setForm((prev) => ({ ...prev, folderId }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-500">메모지 색상</label>
        <ColorPicker value={form.color} onChange={(next) => setForm({ color: next })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-500">메모 진행 상태</label>
        <StatusPicker value={form.status} onChange={(next) => setForm({ status: next })} />
      </div>

      <div className="space-y-1.5">
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

      <label className="block text-xs font-semibold text-zinc-500">제목</label>
      <input
        className={cn(TITLE_INPUT_CLASS, "mt-1.5")}
        value={form.title}
        onChange={(e) => setForm({ title: e.target.value })}
        placeholder="한 줄로 요약"
      />


      <label className="block text-xs font-semibold text-zinc-500">자유 메모</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => insertIntoContent("- [ ] ")}
          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          체크 한 줄
        </button>
        <button
          type="button"
          onClick={() => insertIntoContent(CHECKLIST_MEMO_TEMPLATE)}
          className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
        >
          체크리스트 템플릿
        </button>
      </div>
      <AutoResizeTextarea
        ref={contentTextareaRef}
        className={cn(WORKSPACE_MEMO_TEXTAREA_CLASS, "mt-2 min-h-[100px]")}
        minHeightPx={100}
        maxHeightPx={320}
        value={form.content}
        onChange={(e) => setForm({ content: e.target.value })}
        onSelect={(ev) => {
          const t = ev.currentTarget;
          contentCaretRef.current = { start: t.selectionStart, end: t.selectionEnd };
        }}
        placeholder="생각을 풀어 쓰기… **굵게** *기울임* %%얇게%% 줄바꿈·- 리스트·- [ ] 체크"
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
  onPersistNote,
}: {
  note: IdeaNote;
  memoFolders: DashboardFolderRecord[];
  onPersistNote?: (patch: Partial<Pick<IdeaNote, "content" | "metadata">>) => void;
}) {
  const m = (note.metadata ?? {}) as Record<string, unknown>;
  const folder = memoFolders.find((f) => f.id === note.folderId);
  const folderDisplay = folder ? memoFolderCategoryKey(folder) : note.category;

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
        <StatusPicker value={note.projectStatus || "준비중"} onChange={(next) => onPersistNote?.({ projectStatus: next })} />
      </div>

      <div>
        <div className="text-xs font-semibold text-zinc-500">제목</div>
        <div className="mt-1.5 text-base font-semibold leading-snug text-zinc-950">
          {note.title.trim() || "제목 없음"}
        </div>
      </div>


      <div>
        <div className="text-xs font-semibold text-zinc-500">자유 메모</div>
        <div className="mt-1.5 text-sm font-medium leading-snug text-zinc-700">
          {note.content?.trim() ? (
            <MemoMarkupBody
              text={note.content}
              interactiveCheckboxes={Boolean(onPersistNote)}
              onTextChange={onPersistNote ? (next) => onPersistNote({ content: next }) : undefined}
            />
          ) : (
            "—"
          )}
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
