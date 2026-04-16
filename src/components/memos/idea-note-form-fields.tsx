import type { IdeaNote } from "@/lib/notes-store";
import { type WorkflowRunStatus } from "@/lib/workflow-run-status";
import { cn } from "@/components/ui/cn";
import { 
  statusVisibilityPillClass, 
  statusVisibilitySignalClass 
} from "@/lib/dashboard-status-visibility-styles";

export type MemoColorConfig = {
  key: string;
  bg: string;
  light: string;
  border: string;
  label: string;
};

export const MEMO_COLORS: MemoColorConfig[] = [
  { key: "yellow", bg: "bg-amber-200", light: "bg-amber-50/70", border: "border-amber-300", label: "노랑" },
  { key: "rose", bg: "bg-rose-200", light: "bg-rose-50/70", border: "border-rose-300", label: "분홍" },
  { key: "blue", bg: "bg-sky-200", light: "bg-sky-50/70", border: "border-sky-300", label: "파랑" },
  { key: "green", bg: "bg-emerald-200", light: "bg-emerald-50/70", border: "border-emerald-300", label: "초록" },
  { key: "orange", bg: "bg-orange-200", light: "bg-orange-50/70", border: "border-orange-300", label: "주황" },
  { key: "purple", bg: "bg-purple-200", light: "bg-purple-50/70", border: "border-purple-300", label: "보라" },
];

export type IdeaFormState = {
  title: string;
  content: string;
  folderId: string;
  tags: string[];
  color: string;
  projectStatus: string;
};

export function emptyIdeaFormState(defaultFolderId: string): IdeaFormState {
  return {
    title: "",
    content: "",
    folderId: defaultFolderId,
    tags: [],
    color: "yellow",
    projectStatus: "준비중",
  };
}

export function noteToFormState(note: IdeaNote): IdeaFormState {
  return {
    title: note.title,
    content: note.content,
    folderId: note.folderId,
    tags: [...note.tags],
    color: note.color || "yellow",
    projectStatus: note.projectStatus || "준비중",
  };
}

export function formMetadataFromState(state: IdeaFormState): Record<string, unknown> {
  return {};
}

export function buildIdeaCopyText(form: IdeaFormState): string {
  const lines: string[] = [`제목:\n${form.title}`, `상태: ${form.projectStatus}`, `본문:\n${form.content}`];
  if (form.tags.length > 0) {
    lines.push(`태그:\n${form.tags.map((t) => `#${t}`).join("  ")}`);
  }
  return lines.join("\n\n");
}

export function IdeaFormFields({
  memoFolders,
  form,
  setForm,
}: {
  memoFolders: any[];
  form: IdeaFormState;
  setForm: (patch: Partial<IdeaFormState> | ((prev: IdeaFormState) => IdeaFormState)) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label htmlFor="idea-title" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">제목</label>
        <input
          id="idea-title"
          autoFocus
          className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base font-medium text-zinc-900 shadow-sm transition outline-none focus-visible:border-zinc-300 focus-visible:ring-4 focus-visible:ring-zinc-100/80"
          value={form.title}
          placeholder="아이디어를 한 줄로 요약해 주세요"
          onChange={(e) => setForm({ title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">폴더</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {memoFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setForm({ folderId: f.id })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-all ring-1",
                  form.folderId === f.id
                    ? "bg-zinc-900 text-white ring-zinc-900"
                    : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50"
                )}
              >
                {f.emoji} {f.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">상태</label>
          <div className="mt-1.5">
            <StatusPicker 
              value={form.projectStatus} 
              onChange={(v) => setForm({ projectStatus: v })} 
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="idea-content" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">메모 내용</label>
        <textarea
          id="idea-content"
          className="mt-1.5 block min-h-[160px] w-full resize-none rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-700 shadow-sm transition outline-none focus-visible:border-zinc-300 focus-visible:ring-4 focus-visible:ring-zinc-100/80"
          value={form.content}
          placeholder="구체적인 생각이나 계획을 자유롭게 적어보세요."
          onChange={(e) => setForm({ content: e.target.value })}
        />
      </div>

      {/* Card Color Selection */}
      <div>
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">카드 색상</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {MEMO_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setForm({ color: c.key })}
              className={cn(
                "group relative flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all",
                c.bg,
                form.color === c.key 
                  ? "border-zinc-800 scale-110 shadow-lg z-10" 
                  : "border-white hover:border-zinc-200 hover:scale-105"
              )}
              aria-label={c.label}
            >
              {form.color === c.key && <span className="text-zinc-900 text-lg">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options: WorkflowRunStatus[] = ["시작전", "준비중", "진행중", "보류", "중단", "완료"];
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ring-1 transition-all",
            statusVisibilityPillClass(opt, value === opt)
          )}
        >
          <span className={cn("text-[10px] leading-none", statusVisibilitySignalClass(opt, value === opt))}>⏺</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

export function IdeaMemoReadOnlyPanel({ note, memoFolders }: { note: IdeaNote; memoFolders: any[] }) {
  const folder = memoFolders.find(f => f.id === note.folderId);
  const color = MEMO_COLORS.find(c => c.key === (note.color || "yellow")) || MEMO_COLORS[0]!;
  
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 ring-1 ring-zinc-200">
          {folder ? `${folder.emoji} ${folder.name}` : "폴더 없음"}
        </span>
        <div className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
          statusVisibilityPillClass(note.projectStatus as WorkflowRunStatus || "준비중", true)
        )}>
          <span className={cn("text-[10px] leading-none", statusVisibilitySignalClass(note.projectStatus as WorkflowRunStatus || "준비중", true))}>⏺</span>
          {note.projectStatus || "준비중"}
        </div>
      </div>
      
      <div className={cn(
        "rounded-2xl p-6 shadow-sm border transition-colors",
        color.light,
        color.border
      )}>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 font-medium">
          {note.content}
        </p>
      </div>
      
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {note.tags.map(t => (
            <span key={t} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-400">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
