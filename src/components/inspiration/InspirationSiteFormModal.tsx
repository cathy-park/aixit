"use client";

import { useEffect, useState } from "react";
import { ImageImportBlock } from "@/components/ui/ImageImportBlock";
import { cn } from "@/components/ui/cn";
import type { InspirationSite } from "@/lib/inspiration-store";
import { INSPIRATION_CATEGORIES } from "@/lib/inspiration-store";
import { shouldCommitTagOnEnter } from "@/lib/tag-input-keydown";

function inputClass() {
  return cn(
    "mt-1 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900",
    "outline-none ring-1 ring-zinc-200/80 focus:ring-2 focus:ring-blue-500/30",
  );
}

export function InspirationSiteFormModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  suggestionTags,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: InspirationSite | null;
  onClose: () => void;
  onSave: (site: Omit<InspirationSite, "id" | "shortcutCount"> & { id?: string }) => void;
  suggestionTags?: string[];
}) {
  const [logoUrl, setLogoUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>(INSPIRATION_CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setLogoUrl(initial.logoUrl ?? "");
      setName(initial.name);
      setDescription(initial.description);
      setUrl(initial.url);
      setCategory(initial.category || INSPIRATION_CATEGORIES[0]);
      setMemo(initial.memo);
      setTags(initial.tags ?? []);
      setTagInput("");
    } else {
      setLogoUrl("");
      setName("");
      setDescription("");
      setUrl("");
      setCategory(INSPIRATION_CATEGORIES[0]);
      setMemo("");
      setTags([]);
      setTagInput("");
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

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      id: initial?.id,
      name: trimmedName,
      description: description.trim(),
      url: url.trim(),
      category,
      memo: memo.trim(),
      tags,
      logoUrl: logoUrl.trim(),
      active: initial?.active ?? true,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insp-form-title"
    >
      <button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label="닫기" />

      <div className="relative flex max-h-[min(90vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 id="insp-form-title" className="text-lg font-bold text-zinc-950">
            {mode === "create" ? "사이트 등록하기" : "사이트 수정하기"}
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
            <ImageImportBlock value={logoUrl} onChange={setLogoUrl} label="로고 / 썸네일" />

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">
                사이트 이름 <span className="text-red-500">*</span>
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass()} placeholder="Behance" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">설명</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass()} />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">URL</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass()} placeholder="https://…" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-zinc-800">카테고리</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputClass(), "cursor-pointer")}>
                {INSPIRATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

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
                  <div className="text-[11px] font-semibold text-zinc-500">다른 사이트에서 쓰인 태그</div>
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
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            {mode === "create" ? "등록 완료" : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
