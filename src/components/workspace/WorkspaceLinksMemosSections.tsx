"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { actionIconButtonClass, IconEdit, IconTrash } from "@/components/ui/action-icons";
import type { WorkspaceLinkItem, WorkspaceMemoItem } from "@/lib/workspace-store";

/** 14px 기준 컴팩트 입력 */
export const WORKSPACE_LINK_TITLE_INPUT_CLASS =
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

export const WORKSPACE_LINK_URL_INPUT_CLASS =
  "min-h-9 w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

export const WORKSPACE_MEMO_TEXTAREA_CLASS =
  "w-full resize-y rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";

const SECTION_SHELL = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80";

/** 도구 창고 헤더「추가」와 동일: h-10, rounded-full, bg-zinc-900 */
export const WORKSPACE_HEADER_ADD_MATCH_BTN =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-bold leading-none text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2";

const softPrimaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-zinc-200/90 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-300/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/80";

const softGhostBtn =
  "inline-flex items-center justify-center rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200";

const iconBtnSm = cn(
  actionIconButtonClass,
  "h-7 w-7 rounded-lg bg-white/80 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600",
);

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const startEdit = useCallback((l: WorkspaceLinkItem) => {
    setEditingId(l.id);
    setEditLabel(l.label);
    setEditUrl(l.url);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditLabel("");
    setEditUrl("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || props.mode !== "editable") return;
    props.onUpdateLink(editingId, { label: editLabel, url: editUrl });
    cancelEdit();
  }, [editingId, editLabel, editUrl, props, cancelEdit]);

  useEffect(() => {
    if (props.mode !== "editable") {
      cancelEdit();
      return;
    }
    if (editingId && !props.links.some((l) => l.id === editingId)) {
      cancelEdit();
    }
  }, [props.mode, props.links, editingId, cancelEdit]);

  return (
    <section className={SECTION_SHELL}>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-zinc-900">관련 링크</div>
        <p className="text-sm leading-snug text-zinc-500">{description}</p>
      </div>

      {/* 등록된 항목 리스트 (List State) */}
      <ul className="mt-3 space-y-1.5">
        {props.links.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-200/90 bg-zinc-50/50 px-2.5 py-2 text-sm text-zinc-400">
            등록된 링크가 없어요.
          </li>
        ) : props.mode === "readonly" ? (
          props.links.map((l) => (
            <li
              key={l.id}
              className="flex min-h-9 items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5"
            >
              <a
                href={openHref(l.url)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate py-0.5 pl-0.5 text-sm font-medium leading-snug text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 hover:decoration-zinc-500"
              >
                {l.label || l.url || "링크"}
              </a>
            </li>
          ))
        ) : (
          props.links.map((l) => {
            const isEditing = editingId === l.id;
            return (
              <li
                key={l.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5 ring-1 ring-zinc-100/80"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="링크 제목"
                      className={WORKSPACE_LINK_TITLE_INPUT_CLASS}
                      aria-label="링크 제목 수정"
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://…"
                      className={WORKSPACE_LINK_URL_INPUT_CLASS}
                      aria-label="URL 수정"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={softPrimaryBtn} onClick={saveEdit}>
                        저장
                      </button>
                      <button type="button" className={softGhostBtn} onClick={cancelEdit}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-9 items-center justify-between gap-2">
                    <a
                      href={openHref(l.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 break-words py-0.5 pl-0.5 text-sm font-medium leading-snug text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950 hover:decoration-zinc-500"
                      title={l.label || "링크 열기"}
                    >
                      {l.label || (l.url ? "(URL만 있음)" : "링크")}
                    </a>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(l)}
                        title="수정"
                        aria-label="링크 수정"
                        className={iconBtnSm}
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onRemoveLink(l.id)}
                        title="삭제"
                        aria-label="링크 삭제"
                        className={iconBtnSm}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      {/* 새 링크 입력 폼 (Add Form only) */}
      {props.mode === "editable" ? (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-500">새 링크</div>
          </div>
          <div className="mt-3 space-y-2">
            <input
              value={props.linkDraft.label}
              onChange={(e) => props.onLinkDraftChange({ ...props.linkDraft, label: e.target.value })}
              placeholder="제목"
              className={WORKSPACE_LINK_TITLE_INPUT_CLASS}
              aria-label="새 링크 제목"
            />
            <input
              value={props.linkDraft.url}
              onChange={(e) => props.onLinkDraftChange({ ...props.linkDraft, url: e.target.value })}
              placeholder="URL (https://…)"
              className={WORKSPACE_LINK_URL_INPUT_CLASS}
              aria-label="새 링크 URL"
            />
            <button type="button" onClick={props.onAddLink} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
              링크 추가
            </button>
          </div>
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

/** 읽기 모드 본문: 전체 텍스트 노출, 매우 긴 경우 세로 스크롤로 잘리지 않게 */
const MEMO_READ_BODY_CLASS =
  "max-h-[min(50vh,28rem)] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800";

export function WorkspaceWorkflowCommonMemosSection(props: WorkspaceWorkflowCommonMemosSectionProps) {
  const title = "workflow 공통 메모";
  const description =
    props.description ??
    (props.mode === "readonly"
      ? "카탈로그 템플릿은 읽기 전용이에요. 편집하려면 프로젝트로 만든 뒤 워크스페이스에서 수정하세요."
      : "모든 STEP에서 공유하는 메모입니다.");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = useCallback((m: WorkspaceMemoItem) => {
    setEditingId(m.id);
    setEditText(m.text);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId || props.mode !== "editable") return;
    props.onUpdateMemo(editingId, editText);
    cancelEdit();
  }, [editingId, editText, props, cancelEdit]);

  useEffect(() => {
    if (props.mode !== "editable") {
      cancelEdit();
      return;
    }
    if (editingId && !props.memos.some((m) => m.id === editingId)) {
      cancelEdit();
    }
  }, [props.mode, props.memos, editingId, cancelEdit]);

  return (
    <section className={SECTION_SHELL}>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <p className="text-sm leading-snug text-zinc-500">{description}</p>
      </div>

      {/* 등록된 메모 리스트 */}
      <ul className="mt-3 space-y-1.5">
        {props.memos.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-200/90 bg-zinc-50/50 px-2.5 py-2 text-sm text-zinc-400">
            {props.mode === "readonly" ? "메모가 없어요." : "아직 메모가 없어요."}
          </li>
        ) : props.mode === "readonly" ? (
          props.memos.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5 ring-1 ring-zinc-100/80"
            >
              <div className={MEMO_READ_BODY_CLASS}>{m.text}</div>
            </li>
          ))
        ) : (
          props.memos.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <li
                key={m.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-2.5 py-1.5 ring-1 ring-zinc-100/80"
              >
                {isEditing ? (
                  <div className="flex items-start justify-between gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="메모 내용"
                      rows={4}
                      className={cn(
                        WORKSPACE_MEMO_TEXTAREA_CLASS,
                        "max-h-[min(50vh,28rem)] min-h-[5rem] flex-1 overflow-y-auto",
                      )}
                      aria-label="메모 수정"
                    />
                    <div className="flex shrink-0 flex-col gap-1">
                      <button type="button" className={softPrimaryBtn} onClick={saveEdit}>
                        저장
                      </button>
                      <button type="button" className={softGhostBtn} onClick={cancelEdit}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(MEMO_READ_BODY_CLASS, "min-w-0 flex-1")}>{m.text}</div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        title="수정"
                        aria-label="메모 수정"
                        className={iconBtnSm}
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onRemoveMemo(m.id)}
                        title="삭제"
                        aria-label="메모 삭제"
                        className={iconBtnSm}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      {/* 새 메모 입력 폼 */}
      {props.mode === "editable" ? (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-500">새 메모</div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={props.memoDraft}
              onChange={(e) => props.onMemoDraftChange(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={3}
              className={cn(WORKSPACE_MEMO_TEXTAREA_CLASS, "min-h-[4.5rem] max-h-[min(40vh,24rem)] flex-1")}
              aria-label="새 메모"
            />
            <button type="button" onClick={props.onAddMemo} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
              메모 추가
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
