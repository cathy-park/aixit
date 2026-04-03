"use client";

import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { cn } from "@/components/ui/cn";
import { WORKSPACE_MEMO_TEXTAREA_CLASS } from "@/components/workspace/WorkspaceLinksMemosSections";
import type { IdeaNote, NoteCategory } from "@/lib/notes-store";

export const TITLE_INPUT_CLASS =
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

export type IdeaFormState = {
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

export function emptyIdeaFormState(): IdeaFormState {
  return {
    title: "",
    content: "",
    category: "MVP",
    mvp: { problem: "", hypothesis: "", criticalExperience: "", features: "" },
    lecture: { target: "", goal: "", curriculum: "", assignment: "" },
    novel: { logline: "", worldview: "", characters: "", plot: "" },
  };
}

export function noteToFormState(note: IdeaNote): IdeaFormState {
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

export function formMetadataFromState(form: IdeaFormState): IdeaNote["metadata"] {
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

/** 클립보드용 전체 복사 텍스트 (카테고리별 라벨) */
export function buildIdeaCopyText(form: IdeaFormState): string {
  const lines: string[] = [`제목:\n${form.title}`, `본문:\n${form.content}`];
  if (form.category === "MVP") {
    lines.push(
      `Problem:\n${form.mvp.problem}`,
      `Hypothesis:\n${form.mvp.hypothesis}`,
      `Experience:\n${form.mvp.criticalExperience}`,
      `Features:\n${form.mvp.features}`,
    );
  } else if (form.category === "강의") {
    lines.push(
      `Target:\n${form.lecture.target}`,
      `Goal:\n${form.lecture.goal}`,
      `Curriculum:\n${form.lecture.curriculum}`,
      `Assignment:\n${form.lecture.assignment}`,
    );
  } else if (form.category === "소설") {
    lines.push(
      `Logline:\n${form.novel.logline}`,
      `Worldview:\n${form.novel.worldview}`,
      `Characters:\n${form.novel.characters}`,
      `Plot:\n${form.novel.plot}`,
    );
  }
  return lines.join("\n\n");
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

export function IdeaFormFields({
  form,
  setForm,
}: {
  form: IdeaFormState;
  setForm: (patch: Partial<IdeaFormState> | ((prev: IdeaFormState) => IdeaFormState)) => void;
}) {
  const onCategoryChange = (category: NoteCategory) => {
    setForm((prev) => ({ ...prev, category }));
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-semibold text-zinc-500">카테고리</label>
      <div className="flex flex-wrap gap-2">
        {(["MVP", "강의", "소설", "일반"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCategoryChange(c)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              form.category === c ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80",
            )}
          >
            {c}
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

      {form.category !== "일반" ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{GUIDE_SECTION_LABEL[form.category]}</p>

          {form.category === "MVP" ? (
            <div className="mt-3 space-y-4">
              <FieldWithGuide
                label="Problem · 문제 정의"
                hint="해결하려는 명확한 문제를 적습니다."
                tooltip="누가, 어떤 상황에서, 무엇 때문에 불편한가요?"
                highlight
              >
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.mvp.problem}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mvp: { ...f.mvp, problem: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide
                label="Hypothesis · 핵심 가설"
                hint="검증 가능한 가설 문장으로 적습니다."
                tooltip="측정·실험으로 확인할 수 있는지 점검하세요."
              >
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.mvp.hypothesis}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mvp: { ...f.mvp, hypothesis: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide
                label="Experience · 핵심 경험"
                hint="사용자가 느낄 결정적 순간을 적습니다."
                tooltip="기능 나열이 아니라 느낌·순간에 초점."
              >
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.mvp.criticalExperience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mvp: { ...f.mvp, criticalExperience: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide
                label="Features · MVP 최소 기능"
                hint="줄 단위로 최소 기능만 적습니다."
                tooltip="승격 시 줄마다 할 일로 쪼갤 수 있습니다."
              >
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.mvp.features}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mvp: { ...f.mvp, features: e.target.value } }))
                  }
                />
              </FieldWithGuide>
            </div>
          ) : null}

          {form.category === "강의" ? (
            <div className="mt-3 space-y-4">
              <FieldWithGuide label="Target · 누구에게 무엇을" hint="대상·주제·범위." tooltip="페르소나·수준.">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.lecture.target}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lecture: { ...f.lecture, target: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Goal · 수강생의 변화" hint="강의 후 달라질 모습." tooltip="관찰 가능한 변화." highlight>
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.lecture.goal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lecture: { ...f.lecture, goal: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Curriculum · 목차" hint="주차·차시별 목차." tooltip="">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.lecture.curriculum}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lecture: { ...f.lecture, curriculum: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Assignment · 실습 과제" hint="줄 단위 과제." tooltip="">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.lecture.assignment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lecture: { ...f.lecture, assignment: e.target.value } }))
                  }
                />
              </FieldWithGuide>
            </div>
          ) : null}

          {form.category === "소설" ? (
            <div className="mt-3 space-y-4">
              <FieldWithGuide label="Logline · 한 줄 요약" hint="이야기 한 줄." tooltip="" highlight>
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={72}
                  value={form.novel.logline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, novel: { ...f.novel, logline: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Worldview · 세계관·규칙" hint="" tooltip="">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={88}
                  value={form.novel.worldview}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, novel: { ...f.novel, worldview: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Characters · 결핍·목표" hint="" tooltip="">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={88}
                  value={form.novel.characters}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, novel: { ...f.novel, characters: e.target.value } }))
                  }
                />
              </FieldWithGuide>
              <FieldWithGuide label="Plot · 갈등·기승전결" hint="" tooltip="">
                <AutoResizeTextarea
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                  minHeightPx={88}
                  value={form.novel.plot}
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
  );
}
