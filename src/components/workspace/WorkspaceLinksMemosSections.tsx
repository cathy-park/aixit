"use client";

import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconTrash } from "@/components/ui/action-icons";
import type { WorkspaceLinkItem, WorkspaceMemoItem } from "@/lib/workspace-store";

/** 프로젝트 워크스페이스 기준(9d9fe04) 컴팩트 입력 — 표준 */
export const WORKSPACE_LINK_TITLE_INPUT_CLASS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

export const WORKSPACE_LINK_URL_INPUT_CLASS =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

export const WORKSPACE_MEMO_TEXTAREA_CLASS =
  "w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100";

const SECTION_SHELL = "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200";

function openHref(url: string) {
  const t = url.trim();
  if (!t) return "#";
  return t.startsWith("http") ? t : `https://${t}`;
}

type RelatedLinksEditableProps = {
  mode: "editable";
  links: WorkspaceLinkItem[];
  linkDraft: { label: string; url: string };
  onLinkDraftChange: (next: { label: string; url: string }) => void;
  onAddLink: () => void;
  onRemoveLink: (id: string) => void;
  onUpdateLink: (id: string, patch: Partial<Pick<WorkspaceLinkItem, "label" | "url">>) => void;
  description?: string;
};

type RelatedLinksReadonlyProps = {
  mode: "readonly";
  links: WorkspaceLinkItem[];
  description?: string;
};

export type WorkspaceRelatedLinksSectionProps = RelatedLinksEditableProps | RelatedLinksReadonlyProps;

export function WorkspaceRelatedLinksSection(props: WorkspaceRelatedLinksSectionProps) {
  const description =
    props.description ??
    (props.mode === "readonly" ? "템플릿에 포함된 참고 링크입니다." : "workflow 전체와 연결된 참고 링크입니다.");

  return (
    <section className={SECTION_SHELL}>
      <div className="text-sm font-semibold">관련 링크</div>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      <ul className="mt-4 space-y-2">
        {props.links.length === 0 ? (
          <li className="text-sm text-zinc-500">등록된 링크가 없어요.</li>
        ) : props.mode === "readonly" ? (
          props.links.map((l) => (
            <li key={l.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
              <a
                href={openHref(l.url)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
              >
                {l.label}
              </a>
            </li>
          ))
        ) : (
          props.links.map((l) => (
            <li key={l.id} className="rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block">
                    <span className="sr-only">링크 제목</span>
                    <input
                      value={l.label}
                      onChange={(e) => props.onUpdateLink(l.id, { label: e.target.value })}
                      placeholder="링크 제목"
                      className={WORKSPACE_LINK_TITLE_INPUT_CLASS}
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">URL</span>
                    <input
                      value={l.url}
                      onChange={(e) => props.onUpdateLink(l.id, { url: e.target.value })}
                      placeholder="https://…"
                      className={WORKSPACE_LINK_URL_INPUT_CLASS}
                    />
                  </label>
                  {l.url.trim() ? (
                    <a
                      href={openHref(l.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                    >
                      새 탭에서 열기
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => props.onRemoveLink(l.id)}
                  title="삭제"
                  aria-label="링크 삭제"
                  className={cn(actionIconButtonClass, "h-8 w-8 shrink-0 self-start bg-white")}
                >
                  <IconTrash />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
      {props.mode === "editable" ? (
        <div className="mt-4 space-y-2">
          <input
            value={props.linkDraft.label}
            onChange={(e) => props.onLinkDraftChange({ ...props.linkDraft, label: e.target.value })}
            placeholder="링크 제목"
            className={WORKSPACE_LINK_TITLE_INPUT_CLASS}
          />
          <input
            value={props.linkDraft.url}
            onChange={(e) => props.onLinkDraftChange({ ...props.linkDraft, url: e.target.value })}
            placeholder="https://…"
            className={WORKSPACE_LINK_URL_INPUT_CLASS}
          />
          <button
            type="button"
            onClick={props.onAddLink}
            className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto sm:px-6"
          >
            링크 추가
          </button>
        </div>
      ) : null}
    </section>
  );
}

type CommonMemosEditableProps = {
  mode: "editable";
  memos: WorkspaceMemoItem[];
  memoDraft: string;
  onMemoDraftChange: (v: string) => void;
  onAddMemo: () => void;
  onRemoveMemo: (id: string) => void;
  onUpdateMemo: (id: string, text: string) => void;
  description?: string;
};

type CommonMemosReadonlyProps = {
  mode: "readonly";
  memos: WorkspaceMemoItem[];
  description?: string;
};

export type WorkspaceWorkflowCommonMemosSectionProps = CommonMemosEditableProps | CommonMemosReadonlyProps;

export function WorkspaceWorkflowCommonMemosSection(props: WorkspaceWorkflowCommonMemosSectionProps) {
  const title = "workflow 공통 메모";
  const description =
    props.description ??
    (props.mode === "readonly"
      ? "카탈로그 템플릿은 읽기 전용이에요. 편집하려면 프로젝트로 만든 뒤 워크스페이스에서 수정하세요."
      : "모든 STEP에서 공유하는 메모입니다.");

  return (
    <section className={SECTION_SHELL}>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      <ul className="mt-4 space-y-2">
        {props.memos.length === 0 ? (
          <li className="text-sm text-zinc-500">{props.mode === "readonly" ? "메모가 없어요." : "아직 메모가 없어요."}</li>
        ) : props.mode === "readonly" ? (
          props.memos.map((m) => (
            <li
              key={m.id}
              className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200"
            >
              <span className="whitespace-pre-wrap">{m.text}</span>
            </li>
          ))
        ) : (
          props.memos.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200"
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">공통 메모</span>
                <textarea
                  value={m.text}
                  onChange={(e) => props.onUpdateMemo(m.id, e.target.value)}
                  placeholder="전체 workflow에 해당하는 메모"
                  rows={2}
                  className={WORKSPACE_MEMO_TEXTAREA_CLASS}
                />
              </label>
              <button
                type="button"
                onClick={() => props.onRemoveMemo(m.id)}
                title="삭제"
                aria-label="메모 삭제"
                className={cn(actionIconButtonClass, "h-8 w-8 shrink-0 bg-white")}
              >
                <IconTrash />
              </button>
            </li>
          ))
        )}
      </ul>
      {props.mode === "editable" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="sr-only">공통 메모</span>
            <textarea
              value={props.memoDraft}
              onChange={(e) => props.onMemoDraftChange(e.target.value)}
              placeholder="전체 workflow에 해당하는 메모"
              rows={2}
              className={WORKSPACE_MEMO_TEXTAREA_CLASS}
            />
          </label>
          <button
            type="button"
            onClick={props.onAddMemo}
            className="h-10 shrink-0 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            메모 추가
          </button>
        </div>
      ) : null}
    </section>
  );
}
