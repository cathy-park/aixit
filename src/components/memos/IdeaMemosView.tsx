"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/components/ui/cn";
import {
  WORKSPACE_HEADER_ADD_MATCH_BTN,
  WORKSPACE_MEMO_TEXTAREA_CLASS,
} from "@/components/workspace/WorkspaceLinksMemosSections";
import { listWorkflowTemplates } from "@/lib/aixit-data";
import { loadDashboardFolders } from "@/lib/dashboard-folders-store";
import { appendUserLayoutEntry } from "@/lib/dashboard-layout-store";
import { promoteNoteToProject, type PromoteTemplateChoice } from "@/lib/note-to-project";
import {
  addNote,
  loadNotes,
  NOTES_UPDATED_EVENT,
  removeNote,
  updateNote,
  validateStructuredNote,
  type IdeaNote,
  type NoteCategory,
} from "@/lib/notes-store";

const FILTER_TABS: Array<{ id: "all" | NoteCategory; label: string }> = [
  { id: "all", label: "전체" },
  { id: "MVP", label: "MVP" },
  { id: "강의", label: "강의" },
  { id: "소설", label: "소설" },
];

const TITLE_INPUT_CLASS =
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

function categoryBadgeClass(cat: NoteCategory) {
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
    cat === "MVP" && "border-zinc-800 bg-zinc-900 text-white",
    cat === "강의" && "border-zinc-400 bg-zinc-100 text-zinc-900",
    cat === "소설" && "border-zinc-300 bg-white text-zinc-800",
    cat === "일반" && "border-zinc-200 bg-zinc-50 text-zinc-600",
  );
}

type FormState = {
  title: string;
  content: string;
  category: NoteCategory;
  mvp: {
    problem: string;
    hypothesis: string;
    criticalExperience: string;
    features: string;
  };
  lecture: {
    target: string;
    goal: string;
    curriculum: string;
    assignment: string;
  };
  novel: {
    logline: string;
    worldview: string;
    characters: string;
    plot: string;
  };
};

function noteToFormState(note: IdeaNote): FormState {
  const m = (note.metadata ?? {}) as Record<string, string>;
  return {
    title: note.title,
    content: note.content,
    category: note.category,
    mvp: {
      problem: String(m.problem ?? ""),
      hypothesis: String(m.hypothesis ?? ""),
      criticalExperience: String(m.criticalExperience ?? ""),
      features: String(m.features ?? ""),
    },
    lecture: {
      target: String(m.target ?? ""),
      goal: String(m.goal ?? ""),
      curriculum: String(m.curriculum ?? ""),
      assignment: String(m.assignment ?? ""),
    },
    novel: {
      logline: String(m.logline ?? ""),
      worldview: String(m.worldview ?? ""),
      characters: String(m.characters ?? ""),
      plot: String(m.plot ?? ""),
    },
  };
}

function formMetadata(form: FormState): IdeaNote["metadata"] {
  switch (form.category) {
    case "MVP":
      return {
        problem: form.mvp.problem,
        hypothesis: form.mvp.hypothesis,
        criticalExperience: form.mvp.criticalExperience,
        features: form.mvp.features,
      };
    case "강의":
      return {
        target: form.lecture.target,
        goal: form.lecture.goal,
        curriculum: form.lecture.curriculum,
        assignment: form.lecture.assignment,
      };
    case "소설":
      return {
        logline: form.novel.logline,
        worldview: form.novel.worldview,
        characters: form.novel.characters,
        plot: form.novel.plot,
      };
    default:
      return {};
  }
}

const GUIDE_SECTION_LABEL: Record<NoteCategory, string> = {
  MVP: "MVP 기획 (Lean Start)",
  강의: "강의 기획 (Curriculum)",
  소설: "소설 기획 (Plotting)",
  일반: "",
};

function FieldWithGuide({
  label,
  hint,
  tooltip,
  highlight,
  children,
}: {
  label: string;
  hint: string;
  tooltip: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        highlight &&
          "rounded-lg border-2 border-zinc-900 bg-white p-3 shadow-sm ring-2 ring-zinc-900/10",
        !highlight && "rounded-lg border border-transparent bg-transparent p-0.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-800">{label}</span>
        <span
          className="inline-flex h-5 min-w-[1.25rem] cursor-help items-center justify-center rounded-full border border-zinc-300 px-1 text-[10px] font-bold text-zinc-500"
          title={tooltip}
        >
          ?
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{hint}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function IdeaMemosView() {
  const router = useRouter();
  const [notes, setNotes] = useState<IdeaNote[]>([]);
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]["id"]>("all");
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; note: IdeaNote | null; form: FormState } | null>(
    null,
  );
  const [detail, setDetail] = useState<IdeaNote | null>(null);
  const [templatePickNote, setTemplatePickNote] = useState<IdeaNote | null>(null);

  const refresh = useCallback(() => setNotes(loadNotes()), []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener(NOTES_UPDATED_EVENT, onUpd);
    return () => window.removeEventListener(NOTES_UPDATED_EVENT, onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    return notes.filter((n) => n.category === filter);
  }, [notes, filter]);

  const templates = useMemo(() => listWorkflowTemplates(), []);

  const openCreate = () => {
    setEditor({
      mode: "create",
      note: null,
      form: {
        title: "",
        content: "",
        category: "MVP",
        mvp: { problem: "", hypothesis: "", criticalExperience: "", features: "" },
        lecture: { target: "", goal: "", curriculum: "", assignment: "" },
        novel: { logline: "", worldview: "", characters: "", plot: "" },
      },
    });
  };

  const openEdit = (note: IdeaNote) => {
    setEditor({ mode: "edit", note, form: noteToFormState(note) });
  };

  const saveEditor = () => {
    if (!editor) return;
    const { form, mode, note } = editor;
    const metadata = formMetadata(form);
    const err = validateStructuredNote({ category: form.category, metadata });
    if (err) {
      window.alert(err);
      return;
    }
    if (mode === "create") {
      addNote({
        title: form.title,
        content: form.content,
        category: form.category,
        metadata,
      });
    } else if (note) {
      updateNote(note.id, {
        title: form.title,
        content: form.content,
        category: form.category,
        metadata,
      });
    }
    setEditor(null);
    refresh();
  };

  const defaultFolderId = useMemo(() => {
    const folders = typeof window !== "undefined" ? loadDashboardFolders().filter((f) => !f.hidden) : [];
    return folders[0]?.id ?? "ddokdi";
  }, []);

  const runPromote = (note: IdeaNote, choice: PromoteTemplateChoice) => {
    const err = validateStructuredNote(note);
    if (err) {
      window.alert(err);
      return;
    }
    const result = promoteNoteToProject(note, defaultFolderId, choice);
    if (!result) {
      window.alert("프로젝트를 만들 수 없습니다. 템플릿을 확인해 주세요.");
      return;
    }
    appendUserLayoutEntry(result.projectId, defaultFolderId);
    updateNote(note.id, { isConverted: true, convertedProjectId: result.projectId });
    refresh();
    setTemplatePickNote(null);
    setDetail(null);
    router.push(`/workspace?id=${encodeURIComponent(result.projectId)}`);
  };

  const openTemplatePicker = (note: IdeaNote) => {
    const err = validateStructuredNote(note);
    if (err) {
      window.alert(err);
      return;
    }
    setTemplatePickNote(note);
  };

  const setForm = (patch: Partial<FormState> | ((prev: FormState) => FormState)) => {
    setEditor((e) => {
      if (!e) return e;
      const nextForm = typeof patch === "function" ? patch(e.form) : { ...e.form, ...patch };
      return { ...e, form: nextForm };
    });
  };

  const onCategoryChange = (category: NoteCategory) => {
    setForm((prev) => ({ ...prev, category }));
  };

  return (
    <>
      <AdaptivePageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Lightbulb className="h-7 w-7 shrink-0 text-zinc-800" aria-hidden />
            메모
          </span>
        }
        count={filtered.length}
        description="카테고리별 맞춤 기획을 채운 뒤, 템플릿을 고르고 프로젝트로 승격하세요."
        rightSlot={
          <button type="button" onClick={openCreate} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
            새 아이디어 기록
          </button>
        }
      />

      <AppMainColumn className="pb-20 text-sm leading-relaxed text-zinc-900">
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4" role="tablist" aria-label="카테고리 필터">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.length === 0 ? (
            <li className="col-span-full rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center text-zinc-500">
              메모가 없습니다. 상단에서 새 아이디어를 기록해 보세요.
            </li>
          ) : (
            filtered.map((note) => (
              <li key={note.id}>
                <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100 transition hover:border-zinc-300 hover:ring-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => setDetail(note)}
                    className="flex-1 p-5 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={categoryBadgeClass(note.category)}>{note.category}</span>
                      {note.isConverted ? (
                        <span className="text-xs font-medium text-zinc-400">프로젝트 전환됨</span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-base font-semibold text-zinc-900">
                      {note.title.trim() || "제목 없음"}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{note.content || "본문 없음"}</p>
                  </button>
                  <div className="border-t border-zinc-100 p-4 pt-3">
                    <button
                      type="button"
                      disabled={note.isConverted}
                      onClick={(e) => {
                        e.stopPropagation();
                        openTemplatePicker(note);
                      }}
                      className={cn(
                        WORKSPACE_HEADER_ADD_MATCH_BTN,
                        "w-full",
                        note.isConverted && "cursor-not-allowed opacity-40",
                      )}
                    >
                      이 기획으로 프로젝트 시작하기
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </AppMainColumn>

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
            role="dialog"
            aria-labelledby="memo-editor-title"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 id="memo-editor-title" className="text-base font-semibold text-zinc-900">
                {editor.mode === "create" ? "새 아이디어" : "메모 편집"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                카테고리를 바꿔도 다른 모드에 적어 둔 내용은 유지됩니다. (동적 전환)
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <label className="block text-xs font-semibold text-zinc-500">카테고리</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["MVP", "강의", "소설", "일반"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCategoryChange(c)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      editor.form.category === c
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <label className="mt-5 block text-xs font-semibold text-zinc-500">제목</label>
              <input
                className={cn(TITLE_INPUT_CLASS, "mt-1.5")}
                value={editor.form.title}
                onChange={(e) => setForm({ title: e.target.value })}
                placeholder="한 줄로 요약"
              />

              <label className="mt-4 block text-xs font-semibold text-zinc-500">자유 메모</label>
              <AutoResizeTextarea
                className={cn(WORKSPACE_MEMO_TEXTAREA_CLASS, "mt-1.5 min-h-[100px]")}
                minHeightPx={100}
                value={editor.form.content}
                onChange={(e) => setForm({ content: e.target.value })}
                placeholder="생각을 풀어 쓰기…"
              />

              {editor.form.category !== "일반" ? (
                <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    {GUIDE_SECTION_LABEL[editor.form.category]}
                  </p>

                  {editor.form.category === "MVP" ? (
                    <div className="mt-3 space-y-4">
                      <FieldWithGuide
                        label="Problem · 문제 정의"
                        hint="해결하려는 명확한 문제를 적습니다. 기술보다 비즈니스 가치를 먼저요."
                        tooltip="누가, 어떤 상황에서, 무엇 때문에 불편한가요?"
                        highlight
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.mvp.problem}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, mvp: { ...f.mvp, problem: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Hypothesis · 핵심 가설"
                        hint="「OO를 하면 OO해질 것이다」형태로 검증 가능한 문장으로 적습니다."
                        tooltip="측정하거나 실험으로 확인할 수 있는 가설인지 점검해 보세요."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.mvp.hypothesis}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, mvp: { ...f.mvp, hypothesis: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Experience · 핵심 경험"
                        hint="사용자가 반드시 느껴야 할 결정적 순간(Critical Experience)을 적습니다."
                        tooltip="기능 나열이 아니라 ‘느낌’과 ‘순간’에 초점을 맞춥니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.mvp.criticalExperience}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, mvp: { ...f.mvp, criticalExperience: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Features · MVP 최소 기능"
                        hint="반드시 들어가야 할 기능만 줄 단위로 적습니다."
                        tooltip="승격 시 각 줄이 오늘의 할 일(To-do) 후보로 쪼개질 수 있습니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.mvp.features}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, mvp: { ...f.mvp, features: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                    </div>
                  ) : null}

                  {editor.form.category === "강의" ? (
                    <div className="mt-3 space-y-4">
                      <FieldWithGuide
                        label="Target · 누구에게 무엇을"
                        hint="대상 수강생과 다룰 주제·범위를 구체적으로 적습니다."
                        tooltip="페르소나, 수준, 선수 지식을 함께 써 두면 좋습니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.lecture.target}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, lecture: { ...f.lecture, target: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Goal · 수강생의 변화"
                        hint="강의가 끝난 뒤 수강생이 달라지는 모습을 결과 중심으로 적습니다."
                        tooltip="‘이해한다’보다 ‘할 수 있다/만든다’처럼 관찰 가능한 변화가 좋습니다."
                        highlight
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.lecture.goal}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, lecture: { ...f.lecture, goal: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Curriculum · 목차"
                        hint="주차별·차시별 핵심 목차를 적습니다."
                        tooltip="시간 배분이 떠오르면 옆에 메모해 두어도 좋습니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.lecture.curriculum}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, lecture: { ...f.lecture, curriculum: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Assignment · 실습 과제"
                        hint="학습을 확인할 수 있는 과제·미션을 줄 단위로 적습니다."
                        tooltip="승격 시 과제 줄이 할 일 목록으로 옮겨질 수 있습니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.lecture.assignment}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, lecture: { ...f.lecture, assignment: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                    </div>
                  ) : null}

                  {editor.form.category === "소설" ? (
                    <div className="mt-3 space-y-4">
                      <FieldWithGuide
                        label="Logline · 한 줄 요약"
                        hint="이야기 전체를 관통하는 한 줄을 먼저 고정합니다."
                        tooltip="주인공, 갈등, 내적·외적 목표가 드러나면 좋습니다."
                        highlight
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={72}
                          value={editor.form.novel.logline}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, novel: { ...f.novel, logline: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Worldview · 세계관·규칙"
                        hint="시공간적 배경과 작중 세계의 규칙·제약을 적습니다."
                        tooltip="독자가 헷갈리지 않게 ‘특이한 규칙’은 명시적으로."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={88}
                          value={editor.form.novel.worldview}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, novel: { ...f.novel, worldview: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Characters · 결핍·목표"
                        hint="주인공이 무엇에 결핍되어 있고, 무엇을 얻으려 하는지 적습니다."
                        tooltip="관계·역할이 여러 명이면 구분해서 bullet로."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={88}
                          value={editor.form.novel.characters}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, novel: { ...f.novel, characters: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                      <FieldWithGuide
                        label="Plot · 갈등·기승전결"
                        hint="핵심 갈등과 기승전결의 뼈대만 짚습니다."
                        tooltip="씬 단위가 아니라 ‘전환점’ 위주로 적어도 됩니다."
                      >
                        <AutoResizeTextarea
                          className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                          minHeightPx={88}
                          value={editor.form.novel.plot}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, novel: { ...f.novel, plot: e.target.value } }))
                          }
                        />
                      </FieldWithGuide>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button type="button" onClick={saveEditor} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
            role="dialog"
            aria-labelledby="memo-detail-title"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className={categoryBadgeClass(detail.category)}>{detail.category}</span>
                {detail.isConverted ? (
                  <span className="text-xs text-zinc-400">전환 완료</span>
                ) : null}
              </div>
              <h2 id="memo-detail-title" className="mt-2 text-lg font-semibold text-zinc-900">
                {detail.title.trim() || "제목 없음"}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-zinc-800">
              <section>
                <h3 className="text-xs font-semibold text-zinc-500">본문</h3>
                <p className="mt-1.5 whitespace-pre-wrap text-zinc-700">{detail.content || "—"}</p>
              </section>
              {detail.category === "MVP" ? (
                <MetadataDetailBlock
                  rows={[
                    ["Problem · 문제", (detail.metadata as { problem?: string }).problem],
                    ["Hypothesis · 가설", (detail.metadata as { hypothesis?: string }).hypothesis],
                    ["Experience · 핵심 경험", (detail.metadata as { criticalExperience?: string }).criticalExperience],
                    ["Features · 최소 기능", (detail.metadata as { features?: string }).features],
                  ]}
                />
              ) : null}
              {detail.category === "강의" ? (
                <MetadataDetailBlock
                  rows={[
                    ["Target · 대상·주제", (detail.metadata as { target?: string }).target],
                    ["Goal · 수강생 변화", (detail.metadata as { goal?: string }).goal],
                    ["Curriculum · 목차", (detail.metadata as { curriculum?: string }).curriculum],
                    ["Assignment · 실습", (detail.metadata as { assignment?: string }).assignment],
                  ]}
                />
              ) : null}
              {detail.category === "소설" ? (
                <MetadataDetailBlock
                  rows={[
                    ["Logline", (detail.metadata as { logline?: string }).logline],
                    ["Worldview · 세계관", (detail.metadata as { worldview?: string }).worldview],
                    ["Characters · 결핍·목표", (detail.metadata as { characters?: string }).characters],
                    ["Plot · 갈등·구조", (detail.metadata as { plot?: string }).plot],
                  ]}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm("이 메모를 삭제할까요?")) return;
                  removeNote(detail.id);
                  setDetail(null);
                  refresh();
                }}
                className="mr-auto rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => {
                  openEdit(detail);
                  setDetail(null);
                }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                편집
              </button>
              {detail.isConverted && detail.convertedProjectId ? (
                <Link
                  href={`/workspace?id=${encodeURIComponent(detail.convertedProjectId)}`}
                  className={cn(WORKSPACE_HEADER_ADD_MATCH_BTN, "inline-flex no-underline")}
                >
                  워크스페이스 열기
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={detail.isConverted}
                  onClick={() => {
                    openTemplatePicker(detail);
                    setDetail(null);
                  }}
                  className={cn(
                    WORKSPACE_HEADER_ADD_MATCH_BTN,
                    detail.isConverted && "cursor-not-allowed opacity-40 hover:bg-zinc-900",
                  )}
                >
                  이 기획으로 프로젝트 시작하기
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {templatePickNote ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200"
            role="dialog"
            aria-labelledby="template-pick-title"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 id="template-pick-title" className="text-base font-semibold text-zinc-900">
                프로젝트 템플릿 선택
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                기획 내용은 프로젝트 설명·메모·할 일로 이관됩니다. 워크플로 단계는 템플릿을 고르면 유지됩니다.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <button
                type="button"
                onClick={() => runPromote(templatePickNote, "blank")}
                className="mb-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                빈 프로젝트 (기획 필드 → 단계로만 구성)
              </button>
              <ul className="space-y-2">
                {templates.map((t) => (
                  <li key={t.templateId}>
                    <button
                      type="button"
                      onClick={() => runPromote(templatePickNote, t.templateId)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm hover:bg-zinc-50"
                    >
                      <span className="font-semibold text-zinc-900">
                        {t.emoji ? `${t.emoji} ` : ""}
                        {t.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{t.subtitle}</span>
                      <span className="mt-1 inline-block text-[10px] font-medium text-zinc-400">
                        {t.categoryLabel} · {t.stepCount}단계
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setTemplatePickNote(null)}
                className="w-full rounded-full border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetadataDetailBlock({ rows }: { rows: Array<[string, string | undefined]> }) {
  return (
    <section className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
      {rows.map(([label, val]) => (
        <div key={label}>
          <h3 className="text-xs font-semibold text-zinc-500">{label}</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-zinc-700">{val?.trim() ? val : "—"}</p>
        </div>
      ))}
    </section>
  );
}
