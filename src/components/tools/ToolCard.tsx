"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { keywordTagToneClass, normalizeKeyword } from "@/lib/keyword-tag-styles";
import { isToolEffectivelyActive, type Tool, type ToolCredential } from "@/lib/tools";
import { CredentialProviderMark } from "@/components/tools/CredentialProviderMarks";
import { actionIconButtonClass, IconEdit, IconStarPin, IconTrash } from "@/components/ui/action-icons";
import { IosCardToggle } from "@/components/ui/IosCardToggle";
import { CardActionsOverflow } from "@/components/cards/CardActionsOverflow";
import { MemoMiniMarkupText } from "@/components/workspace/MemoMiniMarkupText";
import { APP_CARD_SHELL_WAREHOUSE_CLASS } from "@/components/cards/app-card-layout";

export type ToolCardMode = "warehouse" | "workflow" | "picker";

/** 도구 카드 외곽 — 앱 공통 창고형 카드 셸 */
export const TOOL_CARD_SHELL_CLASS = APP_CARD_SHELL_WAREHOUSE_CLASS;

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OpenAiMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.096 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.055 6.055 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.744-7.097zm-9.022 12.303a4.475 4.475 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.785.785 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM4.935 17.392a4.482 4.482 0 0 1-.535-3.014l.142.085 4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.196-1.658l-.609-1.003-.001-.001zm-1.59-10.831a4.469 4.469 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.675l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.5 6.561l-.155-1zm15.89-.645-5.833-3.387L15.63 1.36a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.678a.79.79 0 0 0-.407-.667zm2.01 3.022-.141-.085-4.774-2.782a.776.776 0 0 0-.785-.001L8.06 8.92V6.588a.066.066 0 0 1 .029-.061l4.81-2.768a4.5 4.5 0 0 1 6.68 4.66zm-16.34 3.455 2.022-1.159v2.322a.07.07 0 0 1-.028.062L7.07 15.7a4.505 4.505 0 0 1-1.305-8.454l5.833-3.371-.002 2.332a.79.79 0 0 0 .388.67l5.815 3.354-2.02 1.168a.076.076 0 0 1-.072 0l-4.828-2.785z" />
    </svg>
  );
}

function MemoNoteIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block", className)} aria-hidden>
      <Image src="/memo-icon.png" alt="" width={16} height={16} className="h-4 w-4" />
    </span>
  );
}

function CardHeaderIcon({ tool }: { tool: Tool }) {
  const box = "flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl ring-1";
  const url = tool.logoImageUrl?.trim();
  const hex = tool.avatarBackgroundColor?.trim();
  if (url) {
    return (
      <div
        className={cn(box, "ring-zinc-200/80")}
        style={{ backgroundColor: hex && /^#/.test(hex) ? hex : "#f4f4f5" }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (tool.id === "tool_chatgpt") {
    const gptBg = hex && /^#/.test(hex) ? hex : "#059669";
    return (
      <div className={cn(box, "text-white ring-emerald-500/35")} style={{ backgroundColor: gptBg }} aria-hidden>
        <OpenAiMark className="h-9 w-9" />
      </div>
    );
  }
  const label = (tool.logoText ?? tool.name ?? "?").slice(0, 3);
  return (
    <div
      className={cn(box, "text-white ring-zinc-200/80", !hex && "bg-zinc-900", tool.cardAvatarClassName)}
      style={hex && /^#/.test(hex) ? { backgroundColor: hex } : undefined}
      aria-hidden
    >
      <span className={cn("font-extrabold tracking-tight", label.length <= 2 ? "text-[15px]" : "text-[12px]")}>
        {label}
      </span>
    </div>
  );
}

function CardHeaderWithAccountBadge({
  tool,
  hasCreds,
  onAccountClick,
}: {
  tool: Tool;
  hasCreds: boolean;
  onAccountClick: () => void;
}) {
  const provider = tool.credentialProvider ?? "email";

  return (
    <div className="relative h-16 w-16 shrink-0">
      <CardHeaderIcon tool={tool} />
      {hasCreds ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAccountClick();
          }}
          className="absolute -bottom-0.5 -right-0.5 z-10 focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          title="계정 정보"
          aria-label="계정 정보 보기"
        >
          <CredentialProviderMark id={provider} size="xs" />
        </button>
      ) : null}
    </div>
  );
}

function tagList(tool: Tool) {
  return (
    tool.cardTags ??
    (tool.tags ?? tool.capabilities).slice(0, 6).map((t) => ({ label: `#${t}`, variant: "blue" as const }))
  );
}

export function ToolCard({
  tool,
  mode = "warehouse",
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onDisconnect,
  pinned,
  onTogglePinned,
  /** 창고 전용: 스위치 변경 시 `userDisabled` 반영해 저장 */
  onWarehouseTogglePersist,
  className,
}: {
  tool: Tool;
  mode?: ToolCardMode;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisconnect?: () => void;
  /** 별 체크 = 상단 고정 */
  pinned?: boolean;
  onTogglePinned?: () => void;
  onWarehouseTogglePersist?: (next: Tool) => void;
  className?: string;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const effectiveActive = isToolEffectivelyActive(tool);
  const [activeOn, setActiveOn] = useState(effectiveActive);
  const [credPickId, setCredPickId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    setActiveOn(isToolEffectivelyActive(tool));
  }, [tool.active, tool.userDisabled, tool.id]);

  const displayTags = tagList(tool);
  const hasNote = Boolean(tool.highlightNote);
  const creds: ToolCredential[] = tool.credentials?.length
    ? tool.credentials
    : tool.credentialId || tool.credentialSecret || tool.credentialProvider
      ? [
          {
            id: "legacy",
            provider: tool.credentialProvider ?? "email",
            loginId: tool.credentialId,
            secret: tool.credentialSecret,
          },
        ]
      : [];
  const hasCreds = creds.length > 0;
  const activeId = tool.activeCredentialId ?? creds[0]?.id ?? null;
  const pickedId = credPickId ?? activeId;
  const activeCred = (pickedId ? creds.find((c) => c.id === pickedId) : undefined) ?? creds[0] ?? null;
  const accountProvider = activeCred?.provider ?? "email";

  const showWarehouseActions = mode === "warehouse" && (onEdit != null || onDelete != null);
  const showDisconnect = mode === "workflow" && onDisconnect != null;
  const isPicker = mode === "picker";
  const showWarehouseActivationToggle = mode === "warehouse" && onWarehouseTogglePersist != null;

  const cardShell = cn(
    TOOL_CARD_SHELL_CLASS,
    selected && "ring-2 ring-zinc-900 ring-offset-2 ring-offset-zinc-50",
    className,
  );

  /** 비활성: 본문·태그만 흑백(스위치·바로가기는 푸터에서 제외) */
  const grayscaleMainClass = cn(
    !effectiveActive && "grayscale opacity-[0.88] [&_svg]:opacity-70 [&_img]:opacity-90",
  );

  const linkButton =
    !isPicker && tool.href ? (
      <Link
        href={tool.href}
        target={tool.href.startsWith("http") ? "_blank" : undefined}
        rel={tool.href.startsWith("http") ? "noreferrer" : undefined}
        className={cn(
          "inline-flex w-full items-center justify-center rounded-full px-6 py-2.5 text-center text-[13px] font-bold leading-tight shadow-sm sm:w-auto",
          effectiveActive
            ? "bg-blue-600 text-white transition-colors hover:bg-blue-700"
            : "bg-zinc-900 text-white transition-colors hover:bg-zinc-800",
        )}
      >
        바로가기
      </Link>
    ) : null;

  const pickerActivates = isPicker && onSelect;

  return (
    <div
      className={cn(pickerActivates && "cursor-pointer")}
      role={pickerActivates ? "button" : undefined}
      tabIndex={pickerActivates ? 0 : undefined}
      aria-label={pickerActivates ? `${tool.name} 선택` : undefined}
      onClick={pickerActivates ? () => onSelect() : undefined}
      onKeyDown={
        pickerActivates
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <div className={cardShell}>
      <div className={grayscaleMainClass}>
        <div className="flex items-center gap-4">
          <CardHeaderWithAccountBadge
            tool={tool}
            hasCreds={hasCreds}
            onAccountClick={() => {
              setShowSecret(false);
              setCredPickId(null);
              setCredentialOpen(true);
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden">
                  <span className="min-w-0 shrink truncate text-lg font-bold tracking-tight text-zinc-950">
                    {tool.name}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2">
                    {!effectiveActive && tool.userDisabled !== true && tool.active === false ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-amber-900">
                        미결제·한도
                      </span>
                    ) : null}
                    {tool.subscriptionLabel ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200/90 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-sky-800">
                        {tool.subscriptionLabel}
                      </span>
                    ) : null}
                    {hasNote ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNoteOpen(true);
                        }}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full p-1 text-zinc-400",
                          effectiveActive
                            ? "transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                            : "hover:bg-zinc-200/80",
                        )}
                        aria-label="메모 보기"
                        title="메모 보기"
                      >
                        <MemoNoteIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {showDisconnect ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDisconnect();
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm",
                      effectiveActive
                        ? "border-rose-200 bg-white text-rose-700 transition-colors hover:bg-rose-50"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100",
                    )}
                  >
                    연결 해제
                  </button>
                ) : null}
                {showWarehouseActions ? (
                  <CardActionsOverflow
                    className="items-start gap-0"
                    menuAriaLabel="도구 작업"
                    desktopLeading={
                      mode === "warehouse" && onTogglePinned ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTogglePinned();
                          }}
                          className={cn(
                            actionIconButtonClass,
                            "h-8 w-8",
                            effectiveActive && pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                            (!effectiveActive || !pinned) && "text-[#9da2b0] hover:bg-zinc-100 hover:text-zinc-600",
                          )}
                          aria-pressed={Boolean(pinned)}
                          title={pinned ? "상단 고정 해제" : "상단 고정"}
                        >
                          <IconStarPin active={Boolean(pinned) && effectiveActive} />
                        </button>
                      ) : null
                    }
                    mobileLeading={
                      mode === "warehouse" && onTogglePinned ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTogglePinned();
                          }}
                          className={cn(
                            actionIconButtonClass,
                            "h-8 w-8",
                            effectiveActive && pinned && "text-amber-500 hover:bg-amber-50 hover:text-amber-600",
                            (!effectiveActive || !pinned) && "text-[#9da2b0] hover:bg-zinc-100 hover:text-zinc-600",
                          )}
                          aria-pressed={Boolean(pinned)}
                          title={pinned ? "상단 고정 해제" : "상단 고정"}
                        >
                          <IconStarPin active={Boolean(pinned) && effectiveActive} />
                        </button>
                      ) : null
                    }
                  >
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit();
                        }}
                        className={cn(actionIconButtonClass, "h-8 w-8")}
                        title="수정"
                        aria-label="수정"
                      >
                        <IconEdit />
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete();
                        }}
                        className={cn(actionIconButtonClass, "h-8 w-8")}
                        title="삭제"
                        aria-label="삭제"
                      >
                        <IconTrash />
                      </button>
                    ) : null}
                  </CardActionsOverflow>
                ) : null}
              </div>
            </div>
            {tool.description?.trim() ? (
              <p className="mt-[-4px] min-w-0 text-sm leading-snug text-zinc-500">{tool.description.trim()}</p>
            ) : null}
          </div>
        </div>

        {displayTags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {displayTags.map((t, i) => {
              const rawLabel = t.label.startsWith("#") ? t.label.slice(1) : t.label;
              const tone = keywordTagToneClass(normalizeKeyword(rawLabel));
              return (
                <span key={`${t.label}-${i}`} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", tone)}>
                  {t.label.startsWith("#") ? t.label : `#${t.label}`}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className="mt-6 flex flex-col gap-4 border-t border-zinc-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        onClick={isPicker ? (e) => e.stopPropagation() : undefined}
        onKeyDown={isPicker ? (e) => e.stopPropagation() : undefined}
      >
        <div className="flex flex-wrap items-center gap-3">
          {showWarehouseActivationToggle ? (
            <IosCardToggle
              on={activeOn}
              onToggle={() => {
                const turningOff = effectiveActive;
                const nextUserDisabled = turningOff;
                const nextTool: Tool = { ...tool, userDisabled: nextUserDisabled };
                onWarehouseTogglePersist(nextTool);
                setActiveOn(isToolEffectivelyActive(nextTool));
              }}
              aria-label={activeOn ? "비활성화" : "활성화"}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            {effectiveActive ? (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" aria-hidden />
                <span className="font-bold text-[#2563eb]">활성화</span>
                {tool.usageCount != null ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span className="font-medium text-zinc-500">{tool.usageCount}회</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)]"
                  aria-hidden
                />
                <span className="font-bold text-red-600">비활성화</span>
                {tool.usageCount != null ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span className="font-medium text-zinc-500">{tool.usageCount}회</span>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>

        {linkButton ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">{linkButton}</div>
        ) : null}
      </div>

      {credentialOpen && hasCreds ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cred-modal-title">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setCredentialOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <div className="flex items-center gap-3">
              <CredentialProviderMark id={accountProvider} size="md" />
              <h2 id="cred-modal-title" className="text-lg font-bold text-zinc-950">
                계정 정보
              </h2>
            </div>
            {creds.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {creds.map((c) => {
                  const selected = (credPickId ?? activeId) === c.id;
                  const label = c.label?.trim() ? c.label : c.loginId?.trim() ? c.loginId : "계정";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCredPickId(c.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
                        selected ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                      )}
                    >
                      <CredentialProviderMark id={c.provider} size="xs" />
                      <span className="max-w-[14rem] truncate">{label}</span>
                      {tool.activeCredentialId === c.id ? <span className="text-[10px] opacity-90">(대표)</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs font-semibold text-zinc-500">아이디</div>
                <div className="mt-1 font-mono text-sm font-semibold text-zinc-900">{activeCred?.loginId ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-500">비밀번호/키</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-sm font-semibold tracking-wide text-zinc-900">
                    {showSecret ? activeCred?.secret ?? "—" : "●●●●●●●●●●"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                    aria-label={showSecret ? "숨기기" : "표시"}
                  >
                    <IconEye className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCredentialOpen(false)}
              className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {noteOpen && hasNote ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            aria-label="닫기"
            onClick={() => setNoteOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-zinc-900 text-white">
                <MemoNoteIcon className="h-5 w-5" />
              </div>
              <h2 id="note-modal-title" className="text-lg font-bold text-zinc-950">
                메모
              </h2>
            </div>
            <div className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-200">
              <MemoMiniMarkupText text={tool.highlightNote ?? ""} />
            </div>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
