"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon, PaperclipIcon, XIcon, DownloadIcon, SaveIcon, CopyIcon, PencilIcon, CalendarIcon, VideoIcon, MailIcon, FileTextIcon, LinkIcon, PlusIcon, MessageSquareIcon } from "lucide-react";
import { 
  loadMinutesStore, 
  createMeetingMinute, 
  updateMeetingMinute,
  type MinutesFolder,
  type MeetingMinute,
  type AttachmentMeta,
  type MinuteIconType,
  type MinuteLink
} from "@/lib/minutes-store";
import { uploadMinuteAttachment, getMinuteAttachmentUrl, deleteMinuteAttachment } from "@/lib/minutes-storage";
import dynamic from "next/dynamic";
import { formatMinuteToMarkdown, copyMarkdownToClipboard, downloadMarkdownFile } from "@/lib/export-md";
import { AppMainColumn } from "@/components/layout/AppMainColumn";

import "react-quill-new/dist/quill.snow.css";

const MinuteEditorQuill = dynamic(() => import("@/components/minutes/MinuteEditorQuill"), { ssr: false });

export default function MeetingMinuteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = typeof params?.folderId === "string" ? params.folderId : "";
  const minuteId = typeof params?.minuteId === "string" ? params.minuteId : "";
  const isNew = minuteId === "new";

  const [isEditing, setIsEditing] = useState(isNew);

  const [folder, setFolder] = useState<MinutesFolder | null>(null);
  const [minute, setMinute] = useState<MeetingMinute | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [content, setContent] = useState("");
  const [iconType, setIconType] = useState<MinuteIconType>("default");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [links, setLinks] = useState<MinuteLink[]>([]);
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
        setIconType(m.iconType || "default");
        setAttachments(m.attachments || []);
        setLinks(m.links || []);
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
      const m = createMeetingMinute(folderId, title, date, iconType);
      updateMeetingMinute(m.id, { content, attachments, links });
      router.replace(`/minutes/${folderId}/${m.id}`);
    } else {
      updateMeetingMinute(minuteId, { title, date, content, attachments, iconType, links });
      setIsEditing(false);
    }
  };

  const handleAddLink = () => {
    const url = prompt("링크 주소를 입력하세요 (http://...)");
    if (!url) return;
    const linkTitle = prompt("링크 제목을 입력하세요") || url;
    setLinks([...links, { id: Math.random().toString(36).slice(2), url, title: linkTitle }]);
  };

  const handleDeleteLink = (id: string) => {
    if (!confirm("링크를 삭제하시겠습니까?")) return;
    const newLinks = links.filter((l) => l.id !== id);
    setLinks(newLinks);
    if (!isNew) updateMeetingMinute(minuteId, { links: newLinks });
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
      if (!isNew) updateMeetingMinute(minuteId, { attachments: newAtts });
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
    if (path) await deleteMinuteAttachment(path);
    const newAtts = attachments.filter((x) => x.id !== id);
    setAttachments(newAtts);
    if (!isNew) updateMeetingMinute(minuteId, { attachments: newAtts });
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
    <AppMainColumn className="bg-zinc-50 min-h-dvh pt-6">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full flex flex-col h-full bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-zinc-200">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link href={`/minutes`} className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition">
            <ChevronLeftIcon className="w-4 h-4" />
            {folder.name}
          </Link>
        </div>

        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex-1 flex items-start gap-3">
            {isEditing ? (
              <div className="flex items-center gap-3 w-full">
                <select
                  value={iconType}
                  onChange={(e) => setIconType(e.target.value as MinuteIconType)}
                  className="bg-zinc-100 border-none rounded-lg px-3 py-2 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 shrink-0 h-[44px] appearance-none cursor-pointer"
                  style={{ textAlignLast: "center" }}
                >
                  <option value="default">📄 기본</option>
                  <option value="meet">📹 화상</option>
                  <option value="email">📧 이메일</option>
                  <option value="chat">💬 챗봇(말풍선)</option>
                </select>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="회의 제목을 입력하세요"
                  className="text-2xl sm:text-3xl font-extrabold border-none outline-none focus:ring-0 px-0 bg-transparent placeholder-zinc-300 w-full"
                />
              </div>
            ) : (
              <div className="flex items-start gap-3 mt-1">
                {iconType === "meet" && <VideoIcon className="w-8 h-8 shrink-0 text-emerald-500 mt-1" />}
                {iconType === "email" && <MailIcon className="w-8 h-8 shrink-0 text-amber-500 mt-1" />}
                {iconType === "chat" && <MessageSquareIcon className="w-8 h-8 shrink-0 text-blue-500 mt-1" />}
                {(!iconType || iconType === "default") && <FileTextIcon className="w-8 h-8 shrink-0 text-zinc-400 mt-1" />}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 break-words leading-tight">{title || "제목 없음"}</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isNew && !isEditing && (
              <>
                <button onClick={handleCopyMarkdown} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition" title="마크다운 복사">
                  <CopyIcon className="w-5 h-5" />
                </button>
                <button onClick={handleDownloadMarkdown} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition" title="마크다운 다운로드">
                  <DownloadIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition shadow-sm">
                  <PencilIcon className="w-4 h-4" />수정
                </button>
              </>
            )}
            {isEditing && (
              <>
                {!isNew && (
                  <button
                    onClick={() => {
                      if (minute) {
                        setTitle(minute.title);
                        setDate(minute.date);
                        setContent(minute.content);
                        setAttachments(minute.attachments || []);
                      }
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                  >
                    취소
                  </button>
                )}
                <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition shadow-sm">
                  <SaveIcon className="w-4 h-4" />저장
                </button>
              </>
            )}
          </div>
        </div>

        {/* Date Row */}
        <div className="mb-8">
          {isEditing ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <CalendarIcon className="w-4 h-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm text-zinc-600 border border-zinc-200 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-auto max-w-[150px]"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-500 ml-[44px]">
              <CalendarIcon className="w-4 h-4" />
              <span>{date}</span>
            </div>
          )}
        </div>

        {/* Links & Contracts Box */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <PaperclipIcon className="w-4 h-4" /> 관련 링크 및 계약서 첨부
            </h3>
            {isEditing && (
              <div className="flex items-center gap-2">
                <button onClick={handleAddLink} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition px-2.5 py-1.5 rounded-md">
                  <PlusIcon className="w-3 h-3" /> 링크 추가
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition px-2.5 py-1.5 rounded-md disabled:opacity-50">
                  <PlusIcon className="w-3 h-3" /> {uploading ? "업로드 중..." : "파일 추가"}
                </button>
                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3">
            {links.length > 0 && (
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between group rounded-lg bg-indigo-50/40 px-3 py-2 text-sm border border-indigo-100/50">
                    <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-700 hover:text-indigo-900 hover:underline min-w-0 flex-1">
                      <LinkIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.title}</span>
                    </a>
                    {isEditing && (
                      <button onClick={() => handleDeleteLink(link.id)} className="text-indigo-300 hover:text-red-600 transition ml-2 shrink-0" title="삭제">
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-col gap-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between group rounded-lg bg-zinc-50 px-3 py-2 text-sm border border-zinc-200">
                    <button onClick={() => handleDownloadAttachment(att.storagePath)} className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 hover:underline truncate max-w-[80%]">
                      <FileTextIcon className="w-4 h-4 shrink-0 text-zinc-400" />
                      <span className="truncate">{att.name}</span>
                      <span className="text-xs text-zinc-400 ml-1 shrink-0">({Math.round(att.size / 1024)} KB)</span>
                    </button>
                    {isEditing && (
                      <button onClick={() => handleDeleteAttachment(att.id, att.storagePath)} className="text-zinc-400 hover:text-red-600 transition shrink-0 ml-2" title="삭제">
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {links.length === 0 && attachments.length === 0 && (
              <p className="text-sm text-zinc-400 py-2">첨부된 파일이나 링크가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 flex flex-col min-h-0">
          {isEditing ? (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col h-[600px] [&_.quill]:flex-1 [&_.quill]:flex [&_.quill]:flex-col [&_.ql-toolbar]:shrink-0 [&_.ql-container]:flex-1 [&_.ql-container]:overflow-y-auto [&_.ql-editor]:min-h-full">
              <MinuteEditorQuill
                value={content}
                onChange={setContent}
                className="flex-1 flex flex-col h-full"
                placeholder="회의 내용을 자유롭게 작성하세요..."
              />
            </div>
          ) : (
            <div className="ql-snow bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div 
                className="p-6 sm:p-8 min-h-[400px] ql-editor"
                dangerouslySetInnerHTML={{ __html: content || "<p class='text-zinc-400'>내용이 없습니다.</p>" }} 
              />
            </div>
          )}
        </div>
      </div>
    </AppMainColumn>
  );
}
