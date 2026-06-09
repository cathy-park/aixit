"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon, PaperclipIcon, XIcon, DownloadIcon, SaveIcon, CopyIcon } from "lucide-react";
import { 
  loadMinutesStore, 
  createMeetingMinute, 
  updateMeetingMinute,
  type MinutesFolder,
  type MeetingMinute,
  type AttachmentMeta
} from "@/lib/minutes-store";
import { uploadMinuteAttachment, getMinuteAttachmentUrl, deleteMinuteAttachment } from "@/lib/minutes-storage";
import { formatMinuteToMarkdown, copyMarkdownToClipboard, downloadMarkdownFile } from "@/lib/export-md";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";

export default function MeetingMinuteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = typeof params?.folderId === "string" ? params.folderId : "";
  const minuteId = typeof params?.minuteId === "string" ? params.minuteId : "";
  const isNew = minuteId === "new";

  const [folder, setFolder] = useState<MinutesFolder | null>(null);
  const [minute, setMinute] = useState<MeetingMinute | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const store = loadMinutesStore();
    const f = store.folders.find((x) => x.id === folderId);
    if (!f) {
      router.replace("/minutes");
      return;
    }
    setFolder(f);

    if (!isNew) {
      const m = store.minutes.find((x) => x.id === minuteId);
      if (m) {
        setMinute(m);
        setTitle(m.title);
        setDate(m.date);
        setContent(m.content);
        setAttachments(m.attachments || []);
      } else {
        router.replace(`/minutes/${folderId}`);
      }
    }
  }, [folderId, minuteId, isNew, router]);

  const handleSave = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (isNew) {
      const m = createMeetingMinute(folderId, title, date);
      updateMeetingMinute(m.id, { content, attachments });
      router.replace(`/minutes/${folderId}/${m.id}`);
    } else {
      updateMeetingMinute(minuteId, { title, date, content, attachments });
      alert("저장되었습니다.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const newAtts = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = await uploadMinuteAttachment(file);
        newAtts.push({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          size: file.size,
          type: file.type,
          storagePath: path,
        });
      }
      setAttachments(newAtts);
      if (!isNew) {
        updateMeetingMinute(minuteId, { attachments: newAtts });
      }
    } catch (err) {
      console.error(err);
      alert("파일 첨부 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (id: string, path?: string) => {
    if (!confirm("첨부파일을 삭제하시겠습니까?")) return;
    if (path) {
      await deleteMinuteAttachment(path);
    }
    const newAtts = attachments.filter((x) => x.id !== id);
    setAttachments(newAtts);
    if (!isNew) {
      updateMeetingMinute(minuteId, { attachments: newAtts });
    }
  };

  const handleDownloadAttachment = async (path?: string) => {
    if (!path) return;
    const url = await getMinuteAttachmentUrl(path);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("파일을 불러오지 못했습니다.");
    }
  };

  const handleCopyMarkdown = async () => {
    if (!minute || !folder) return;
    // 임시로 최신 상태 반영 (저장 전일 수 있으므로)
    const currentM = { ...minute, title, date, content, attachments };
    const md = formatMinuteToMarkdown(currentM, folder.name);
    const ok = await copyMarkdownToClipboard(md);
    if (ok) alert("마크다운이 클립보드에 복사되었습니다!");
  };

  const handleDownloadMarkdown = () => {
    if (!folder) return;
    const currentM = { ...(minute as MeetingMinute), title, date, content, attachments };
    const md = formatMinuteToMarkdown(currentM, folder.name);
    downloadMarkdownFile(`${title}_회의록`, md);
  };

  if (!folder) return null;

  return (
    <AppMainColumn>
      <AdaptivePageHeader
        title={
          <div className="flex items-center gap-2">
            <Link href={`/minutes/${folder.id}`} className="p-1 -ml-1 text-zinc-400 hover:text-zinc-900 transition">
              <ChevronLeftIcon className="w-6 h-6" />
            </Link>
            {isNew ? "새 회의록" : title}
          </div>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full flex flex-col h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-2 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="회의 제목"
              className="text-2xl font-bold border-none outline-none focus:ring-0 px-0 bg-transparent placeholder-zinc-300"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm text-zinc-500 border-none outline-none focus:ring-0 px-0 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <button
                  onClick={handleCopyMarkdown}
                  className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                  title="마크다운 복사"
                >
                  <CopyIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                  title="마크다운 다운로드"
                >
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <SaveIcon className="w-4 h-4" />저장
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="회의 내용을 마크다운 형식으로 작성하세요..."
            className="w-full flex-1 min-h-[300px] resize-none rounded-xl border border-zinc-200 p-4 text-zinc-800 placeholder-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <PaperclipIcon className="w-4 h-4" /> 첨부파일
              </h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {uploading ? "업로드 중..." : "+ 파일 추가"}
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            
            {attachments.length === 0 ? (
              <p className="text-xs text-zinc-500">첨부된 파일이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {attachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between group rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <button
                      onClick={() => handleDownloadAttachment(att.storagePath)}
                      className="text-zinc-700 hover:text-blue-600 hover:underline truncate max-w-[80%]"
                    >
                      {att.name} <span className="text-xs text-zinc-400 ml-1">({Math.round(att.size / 1024)} KB)</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAttachment(att.id, att.storagePath)}
                      className="text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
                      title="삭제"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppMainColumn>
  );
}
