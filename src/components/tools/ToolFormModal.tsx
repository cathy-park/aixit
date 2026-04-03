"use client";

import { useEffect, useState } from "react";
import { ImageImportBlock } from "@/components/ui/ImageImportBlock";
import type { CredentialProviderId, Tool, ToolCardTagVariant, ToolCredential } from "@/lib/tools";
import { tools as seedTools } from "@/lib/tools";
import { cn } from "@/components/ui/cn";
import { makeUserToolId } from "@/lib/user-tools-store";
import { shouldCommitTagOnEnter } from "@/lib/tag-input-keydown";
import { CREDENTIAL_PROVIDER_LIST, CredentialProviderMark } from "@/components/tools/CredentialProviderMarks";

const VARIANTS: ToolCardTagVariant[] = ["blue", "purple", "green"];

function inferPrice(t: Tool) {
  const sub = t.subscriptionLabel?.trim() ?? "";
  if (!sub) return { priceType: "없음", priceInfo: "" };
  if (sub.includes("구독")) {
    const rest = sub.replace(/^💳\s*/, "").replace(/^구독\s*/, "").trim();
    return { priceType: "구독형", priceInfo: rest || "" };
  }
  if (sub === "무료") return { priceType: "무료", priceInfo: "" };
  return { priceType: "직접입력", priceInfo: sub };
}

function tagsFromTool(t: Tool): string[] {
  if (t.cardTags?.length) return t.cardTags.map((x) => x.label.replace(/^#/, "").trim());
  return [...(t.tags ?? [])];
}

function buildSubscriptionLabel(priceType: string, priceInfo: string): string | undefined {
  const p = priceInfo.trim();
  if (priceType === "구독형") return p ? `💳 구독 ${p}` : "💳 구독";
  if (priceType === "무료") return "무료";
  if (priceType === "직접입력" && p) return p;
  return undefined;
}

function inputClass() {
  return cn(
    "mt-1 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900",
    "outline-none ring-1 ring-zinc-200/80 focus:ring-2 focus:ring-blue-500/30",
  );
}

function makeCredId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cred_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function legacyToCredentials(t: Tool | null): { list: ToolCredential[]; activeId?: string } {
  if (!t) return { list: [] };
  if (t.credentials?.length) return { list: t.credentials, activeId: t.activeCredentialId };
  const hasLegacy = Boolean(t.credentialId || t.credentialSecret || t.credentialProvider);
  if (!hasLegacy) return { list: [] };
  const id = makeCredId();
  return {
    list: [
      {
        id,
        provider: t.credentialProvider ?? "email",
        loginId: t.credentialId,
        secret: t.credentialSecret,
      },
    ],
    activeId: id,
  };
}

export function ToolFormModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  suggestionTags,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: Tool | null;
  onClose: () => void;
  onSave: (tool: Tool) => void;
  /** 도구 창고 전체에서 모은 태그 (현재 입력·이미 추가된 태그는 제외하고 표시) */
  suggestionTags?: string[];
}) {
  const [logoImageUrl, setLogoImageUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [href, setHref] = useState("");
  const [credentials, setCredentials] = useState<ToolCredential[]>([]);
  const [activeCredentialId, setActiveCredentialId] = useState<string | undefined>(undefined);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [credLabel, setCredLabel] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialSecret, setCredentialSecret] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [credentialProvider, setCredentialProvider] = useState<CredentialProviderId>("email");
  const [active, setActive] = useState(true);
  const [priceType, setPriceType] = useState("무료");
  const [priceInfo, setPriceInfo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setLogoImageUrl(initial.logoImageUrl ?? "");
      setName(initial.name);
      setDescription(initial.description ?? "");
      setHref(initial.href ?? "");
      const legacy = legacyToCredentials(initial);
      setCredentials(legacy.list);
      setActiveCredentialId(legacy.activeId ?? legacy.list[0]?.id);
      setEditingCredentialId(null);
      setCredLabel("");
      setCredentialId("");
      setCredentialSecret("");
      setCredentialProvider("email");
      setMemo(initial.highlightNote ?? "");
      setTags([...new Set(tagsFromTool(initial))]);
      setTagInput("");
      setActive(initial.active);
      const pr = inferPrice(initial);
      setPriceType(pr.priceType);
      setPriceInfo(pr.priceInfo);
    } else {
      setLogoImageUrl("");
      setName("");
      setDescription("");
      setHref("");
      setCredentials([]);
      setActiveCredentialId(undefined);
      setEditingCredentialId(null);
      setCredLabel("");
      setCredentialId("");
      setCredentialSecret("");
      setCredentialProvider("email");
      setMemo("");
      setTags([]);
      setTagInput("");
      setActive(true);
      setPriceType("무료");
      setPriceInfo("");
    }
  }, [open, mode, initial]);

  if (!open) return null;

  const addTag = () => {
    const t = tagInput.trim().replace(/^#+/, "");
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const addCredential = () => {
    const loginTrim = credentialId.trim();
    const secretTrim = credentialSecret.trim();
    const labelTrim = credLabel.trim();
    const hasAnything = Boolean(loginTrim || secretTrim || labelTrim);
    if (!hasAnything) return;
    const id = makeCredId();
    const item: ToolCredential = {
      id,
      provider: credentialProvider,
      loginId: loginTrim || undefined,
      secret: secretTrim || undefined,
      label: labelTrim || undefined,
    };
    setCredentials((prev) => [item, ...prev]);
    setActiveCredentialId((cur) => cur ?? id);
    setCredLabel("");
    setCredentialId("");
    setCredentialSecret("");
    setCredentialProvider("email");
  };

  const removeCredential = (id: string) => {
    setCredentials((prev) => prev.filter((c) => c.id !== id));
    setActiveCredentialId((cur) => (cur === id ? undefined : cur));
    setEditingCredentialId((cur) => (cur === id ? null : cur));
  };

  const startEditCredential = (c: ToolCredential) => {
    setEditingCredentialId(c.id);
    setCredentialProvider(c.provider);
    setCredLabel(c.label ?? "");
    setCredentialId(c.loginId ?? "");
    setCredentialSecret(c.secret ?? "");
  };

  const cancelEditCredential = () => {
    setEditingCredentialId(null);
    setCredLabel("");
    setCredentialId("");
    setCredentialSecret("");
    setCredentialProvider("email");
  };

  const commitEditCredential = () => {
    const id = editingCredentialId;
    if (!id) return;
    const loginTrim = credentialId.trim();
    const secretTrim = credentialSecret.trim();
    const labelTrim = credLabel.trim();
    const hasAnything = Boolean(loginTrim || secretTrim || labelTrim);
    if (!hasAnything) return;

    setCredentials((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              provider: credentialProvider,
              label: labelTrim || undefined,
              loginId: loginTrim || undefined,
              secret: secretTrim || undefined,
            },
      ),
    );
    setEditingCredentialId(null);
    setCredLabel("");
    setCredentialId("");
    setCredentialSecret("");
    setCredentialProvider("email");
  };

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const subscriptionLabel = buildSubscriptionLabel(priceType, priceInfo);
    const cardTags: Array<{ label: string; variant: ToolCardTagVariant }> = tags.map((label, i) => ({
      label: label.startsWith("#") ? label : `#${label}`,
      variant: VARIANTS[i % VARIANTS.length],
    }));

    const logoText = trimmedName.slice(0, 3);
    const activeCred =
      (activeCredentialId ? credentials.find((c) => c.id === activeCredentialId) : undefined) ?? credentials[0];
    const hasCredData = Boolean(activeCred?.loginId || activeCred?.secret);

    const basePartial: Partial<Tool> = {
      name: trimmedName,
      description: description.trim() || undefined,
      href: href.trim() || undefined,
      logoText,
      logoImageUrl: logoImageUrl.trim() || undefined,
      credentials: credentials.length ? credentials : undefined,
      activeCredentialId: activeCredentialId ?? (credentials[0]?.id || undefined),
      // 레거시 필드: 카드/기존 UI 호환용으로 대표 계정을 미러링
      credentialId: hasCredData ? activeCred?.loginId : undefined,
      credentialSecret: hasCredData ? activeCred?.secret : undefined,
      credentialProvider: hasCredData ? activeCred?.provider : undefined,
      highlightNote: memo.trim() || undefined,
      active,
      subscriptionLabel,
      tags: tags.length ? tags : undefined,
      cardTags: cardTags.length ? cardTags : undefined,
    };

    if (mode === "create") {
      const tool: Tool = {
        id: makeUserToolId(),
        name: trimmedName,
        category: "Custom",
        capabilities: ["planning"],
        difficulty: "easy",
        recommendedFor: [],
        active,
        ...basePartial,
      };
      onSave(tool);
      onClose();
      return;
    }

    if (!initial) return;
    const seed = seedTools.find((s) => s.id === initial.id);
    if (initial.id.startsWith("user_tool_")) {
      const tool: Tool = {
        ...initial,
        ...basePartial,
        name: trimmedName,
      } as Tool;
      onSave(tool);
      onClose();
      return;
    }

    const merged: Tool = seed
      ? { ...seed, ...initial, ...basePartial, id: initial.id }
      : { ...initial, ...basePartial, id: initial.id };
    onSave(merged);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tool-form-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" aria-label="닫기" />

      <div className="relative flex max-h-[min(90vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 id="tool-form-title" className="text-lg font-bold text-zinc-950">
            {mode === "create" ? "도구 추가하기" : "도구 수정하기"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"
            aria-label="닫기"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <ImageImportBlock value={logoImageUrl} onChange={setLogoImageUrl} label="로고 이미지" />

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">
                도구 이름 <span className="text-red-500">*</span>
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} placeholder="예: ChatGPT" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">설명</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass()} />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">URL</span>
              <input value={href} onChange={(e) => setHref(e.target.value)} className={inputClass()} placeholder="https://…" />
            </label>

            <div className="rounded-3xl bg-zinc-50 p-4 ring-1 ring-zinc-200/70">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-xs font-bold text-zinc-800">계정</div>
                <div className="text-[11px] font-semibold text-zinc-500">여러 개 추가 가능</div>
              </div>

              {credentials.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {credentials.map((c) => {
                    const selected = (activeCredentialId ?? credentials[0]?.id) === c.id;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1",
                          selected ? "ring-blue-200" : "ring-zinc-200",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveCredentialId(c.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <CredentialProviderMark id={c.provider} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-900">
                              {c.label?.trim() ? c.label : c.loginId?.trim() ? c.loginId : "계정"}
                            </div>
                            <div className="truncate text-xs text-zinc-500">
                              {c.loginId?.trim() ? c.loginId : "아이디 없음"} · {c.secret?.trim() ? "비밀값 있음" : "비밀값 없음"}
                              {selected ? " · 대표" : ""}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditCredential(c)}
                          className={cn(
                            "shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 hover:bg-zinc-50",
                            editingCredentialId === c.id ? "text-blue-700 ring-blue-200" : "text-zinc-700 ring-zinc-200",
                          )}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCredential(c.id)}
                          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-sm text-zinc-500">아직 추가된 계정이 없어요.</div>
              )}

              <div className="mt-4 border-t border-zinc-200/70 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-xs font-bold text-zinc-800">{editingCredentialId ? "계정 수정" : "새 계정 추가"}</div>
                  {editingCredentialId ? (
                    <button
                      type="button"
                      onClick={cancelEditCredential}
                      className="text-[11px] font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                    >
                      편집 취소
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CREDENTIAL_PROVIDER_LIST.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCredentialProvider(p.id)}
                      title={p.label}
                      className={cn(
                        "rounded-2xl p-1.5 ring-2 transition",
                        credentialProvider === p.id ? "ring-blue-500" : "ring-transparent hover:ring-zinc-200",
                      )}
                    >
                      <CredentialProviderMark id={p.id} size="sm" />
                    </button>
                  ))}
                </div>

                <label className="mt-3 block">
                  <span className="text-xs font-bold text-zinc-800">별칭(선택)</span>
                  <input value={credLabel} onChange={(e) => setCredLabel(e.target.value)} className={inputClass()} placeholder="예: 개인 / 회사" />
                </label>

                <label className="mt-3 block">
                  <span className="text-xs font-bold text-zinc-800">아이디/이메일</span>
                  <input value={credentialId} onChange={(e) => setCredentialId(e.target.value)} className={inputClass()} />
                </label>

                <label className="mt-3 block">
                  <span className="text-xs font-bold text-zinc-800">비밀번호/API 키</span>
                  <input
                    value={credentialSecret}
                    onChange={(e) => setCredentialSecret(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={inputClass()}
                  />
                </label>

                <button
                  type="button"
                  onClick={editingCredentialId ? commitEditCredential : addCredential}
                  disabled={!(credentialId.trim() || credentialSecret.trim() || credLabel.trim())}
                  className={cn(
                    "mt-3 w-full rounded-2xl bg-white py-3 text-sm font-bold text-zinc-900 ring-1 ring-zinc-200",
                    credentialId.trim() || credentialSecret.trim() || credLabel.trim()
                      ? "hover:bg-zinc-50"
                      : "cursor-not-allowed opacity-50",
                  )}
                >
                  {editingCredentialId ? "수정 완료" : "계정 추가"}
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">메모</span>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="**굵게** *기울임* %%얇게%%"
                className={cn(inputClass(), "resize-y")}
              />
            </label>

            <div>
              <div className="text-xs font-bold text-zinc-800">태그</div>
              <div className="mt-2 flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (!shouldCommitTagOnEnter(e)) return;
                    e.preventDefault();
                    addTag();
                  }}
                  placeholder="태그 입력 후 엔터"
                  className={cn(inputClass(), "mt-0 flex-1")}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="shrink-0 rounded-full bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200"
                  >
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="text-zinc-500 hover:text-zinc-900" aria-label="제거">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {suggestionTags && suggestionTags.length > 0 ? (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-zinc-500">다른 도구에서 쓰인 태그</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {suggestionTags
                      .filter(
                        (s) =>
                          !tags.includes(s) &&
                          (!tagInput.trim() || s.toLowerCase().includes(tagInput.trim().toLowerCase())),
                      )
                      .slice(0, 32)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (tags.includes(s)) return;
                            setTags((prev) => [...prev, s]);
                          }}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                        >
                          #{s}
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-zinc-100 px-4 py-3 ring-1 ring-zinc-200/80">
              <span className="text-sm font-bold text-zinc-900">활성화</span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((v) => !v)}
                className={cn(
                  "relative h-8 w-[52px] shrink-0 rounded-full transition-colors",
                  active ? "bg-blue-600" : "bg-zinc-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform",
                    active && "translate-x-5",
                  )}
                />
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">가격 타입</span>
              <select value={priceType} onChange={(e) => setPriceType(e.target.value)} className={cn(inputClass(), "cursor-pointer")}>
                <option value="없음">없음</option>
                <option value="구독형">구독형</option>
                <option value="무료">무료</option>
                <option value="직접입력">직접입력</option>
              </select>
            </label>

            {(priceType === "구독형" || priceType === "직접입력") && (
              <label className="block">
                <span className="text-xs font-bold text-zinc-800">가격 정보</span>
                <input
                  value={priceInfo}
                  onChange={(e) => setPriceInfo(e.target.value)}
                  className={inputClass()}
                  placeholder={priceType === "구독형" ? "$20/월" : "표시할 문구"}
                />
              </label>
            )}

          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            {mode === "create" ? "추가 완료" : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
