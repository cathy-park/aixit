"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/components/ui/cn";
import { LinkIcon } from "lucide-react";

/* ──────────────────────────────────────────────
   파비콘 탭 타입
────────────────────────────────────────────── */
type FaviconTab = "auto" | "emoji" | "image";

/* ──────────────────────────────────────────────
   이미지 리사이징 (파일 업로드용)
────────────────────────────────────────────── */
async function resizeImage(dataUrl: string, max = 256): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > max) { height = (height * max) / width; width = max; }
      if (height > max) { width = (width * max) / height; height = max; }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = async () => {
      const result = r.result as string;
      resolve(result.length > 200 * 1024 ? await resizeImage(result) : result);
    };
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/* ──────────────────────────────────────────────
   파비콘 URL 추출 헬퍼
────────────────────────────────────────────── */
function getAutoFaviconUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const { hostname, pathname } = parsed;
    if (hostname === "docs.google.com") {
      if (pathname.startsWith("/spreadsheets")) return "https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico";
      if (pathname.startsWith("/document")) return "https://ssl.gstatic.com/docs/documents/share/images/favicon3.ico";
      if (pathname.startsWith("/presentation")) return "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico";
      if (pathname.startsWith("/forms")) return "https://ssl.gstatic.com/docs/forms/favicon_qp2.png";
    }
    if (hostname === "drive.google.com") return "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────
   공통 input 스타일
────────────────────────────────────────────── */
const inputCls = cn(
  "mt-1 w-full rounded-2xl border-0 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900",
  "outline-none ring-1 ring-zinc-200/80 focus:ring-2 focus:ring-blue-500/30 transition",
);

/* ──────────────────────────────────────────────
   Props
────────────────────────────────────────────── */
export type MinuteLinkFormPayload = {
  url: string;
  title: string;
  /** 커스텀 파비콘: 이미지 URL·dataURL 또는 이모지 문자. 없으면 자동 파비콘 사용 */
  customIcon?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (payload: MinuteLinkFormPayload) => void;
  /** 수정 모드용 초기값 */
  initial?: MinuteLinkFormPayload | null;
}

/* ──────────────────────────────────────────────
   컴포넌트
────────────────────────────────────────────── */
export function MinuteLinkFormModal({ open, onClose, onSave, initial }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [faviconTab, setFaviconTab] = useState<FaviconTab>("auto");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [emoji, setEmoji] = useState("");
  const [faviconError, setFaviconError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* open 시 초기화 */
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setUrl(initial.url);
      setTitle(initial.title);
      const icon = initial.customIcon ?? "";
      // 이모지 판단: 단일 이모지 문자인지 확인 (이미지 URL·dataURL 아닌 경우)
      if (icon && !icon.startsWith("http") && !icon.startsWith("data:")) {
        setFaviconTab("emoji");
        setEmoji(icon);
        setImageUrl("");
      } else if (icon) {
        setFaviconTab("image");
        setImageUrl(icon);
        setEmoji("");
      } else {
        setFaviconTab("auto");
        setImageUrl("");
        setEmoji("");
      }
    } else {
      setUrl(""); setTitle(""); setFaviconTab("auto");
      setImageUrl(""); setImageUrlDraft(""); setEmoji("");
    }
    setFaviconError(false);
  }, [open, initial]);

  /* URL 바뀌면 자동 파비콘 에러 리셋 */
  useEffect(() => { setFaviconError(false); }, [url]);

  /* 파일 선택 핸들러 */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageUrl(dataUrl);
      setFaviconTab("image");
    } catch { /* ignore */ }
    e.target.value = "";
  }, []);

  /* 미리보기용 파비콘 결정 */
  const autoFaviconUrl = getAutoFaviconUrl(url);
  const previewIcon: { type: "img" | "emoji" | "placeholder"; src?: string; char?: string } =
    faviconTab === "image" && imageUrl
      ? { type: "img", src: imageUrl }
      : faviconTab === "emoji" && emoji
      ? { type: "emoji", char: emoji }
      : autoFaviconUrl && !faviconError
      ? { type: "img", src: autoFaviconUrl }
      : { type: "placeholder" };

  const handleSave = () => {
    const trimUrl = url.trim();
    const trimTitle = title.trim() || trimUrl;
    if (!trimUrl) return;

    let customIcon: string | undefined;
    if (faviconTab === "image" && imageUrl) customIcon = imageUrl;
    else if (faviconTab === "emoji" && emoji) customIcon = emoji;
    // auto면 customIcon 없음

    onSave({ url: trimUrl, title: trimTitle, customIcon });
    onClose();
  };

  if (!open) return null;

  const isEdit = Boolean(initial);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="minute-link-form-title"
    >
      {/* 배경 클릭 → 닫기 */}
      <button type="button" onClick={onClose} className="absolute inset-0 cursor-default" aria-label="닫기" />

      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 id="minute-link-form-title" className="text-lg font-bold text-zinc-950">
            {isEdit ? "링크 수정" : "링크 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 transition"
            aria-label="닫기"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* 바디 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* URL */}
          <label className="block">
            <span className="text-xs font-bold text-zinc-800">
              URL <span className="text-red-500">*</span>
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => { if (url.trim() && !title) { /* 나중에 자동 제목 추출 가능 */ } }}
              className={inputCls}
              placeholder="https://…"
              autoFocus
            />
          </label>

          {/* 제목 */}
          <label className="block">
            <span className="text-xs font-bold text-zinc-800">링크 제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="URL을 입력하면 자동으로 채워져요"
            />
          </label>

          {/* 파비콘 / 아이콘 설정 */}
          <div>
            <div className="text-xs font-bold text-zinc-800 mb-2">아이콘</div>

            {/* 탭 */}
            <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit mb-4">
              {(["auto", "image", "emoji"] as FaviconTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFaviconTab(tab)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    faviconTab === tab
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      : "text-zinc-500 hover:text-zinc-700",
                  )}
                >
                  {tab === "auto" ? "🔗 자동 (파비콘)" : tab === "image" ? "🖼 이미지" : "😀 이모지"}
                </button>
              ))}
            </div>

            {/* 미리보기 + 탭 내용 */}
            <div className="flex items-start gap-4">
              {/* 미리보기 */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-200 bg-white">
                {previewIcon.type === "img" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewIcon.src}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={() => setFaviconError(true)}
                  />
                ) : previewIcon.type === "emoji" ? (
                  <span className="text-2xl">{previewIcon.char}</span>
                ) : (
                  <LinkIcon className="w-6 h-6 text-zinc-300" />
                )}
              </div>

              {/* 탭별 입력 */}
              <div className="flex-1 min-w-0">
                {faviconTab === "auto" && (
                  <p className="text-xs text-zinc-500 leading-relaxed pt-1">
                    URL을 입력하면 해당 사이트의 파비콘을 자동으로 가져옵니다.
                    <br />아이콘을 직접 지정하려면 이미지 또는 이모지 탭을 선택하세요.
                  </p>
                )}

                {faviconTab === "image" && (
                  <div className="space-y-2">
                    {/* 파일 선택 */}
                    <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 transition"
                    >
                      📁 파일에서 선택
                    </button>
                    {/* URL 입력 */}
                    <div className="flex gap-2">
                      <input
                        value={imageUrlDraft}
                        onChange={(e) => setImageUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (imageUrlDraft.trim()) { setImageUrl(imageUrlDraft.trim()); setImageUrlDraft(""); }
                          }
                        }}
                        placeholder="이미지 주소 (URL)"
                        className="flex-1 rounded-xl border-0 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/30 transition"
                      />
                      <button
                        type="button"
                        onClick={() => { if (imageUrlDraft.trim()) { setImageUrl(imageUrlDraft.trim()); setImageUrlDraft(""); } }}
                        className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                      >
                        적용
                      </button>
                    </div>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl("")} className="text-xs font-semibold text-rose-500 hover:underline">
                        이미지 제거
                      </button>
                    )}
                  </div>
                )}

                {faviconTab === "emoji" && (
                  <div>
                    <input
                      value={emoji}
                      onChange={(e) => setEmoji(e.target.value)}
                      placeholder="이모지를 입력하세요 (예: 📄)"
                      maxLength={4}
                      className="w-full rounded-xl border-0 bg-zinc-100 px-4 py-3 text-2xl outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/30 transition"
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-400">
                      이모지 키패드: Mac은 <kbd className="rounded bg-zinc-100 px-1 py-0.5 text-[10px]">⌃⌘Space</kbd>, 모바일은 이모지 키보드
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="shrink-0 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!url.trim()}
            className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isEdit ? "수정 완료" : "링크 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
