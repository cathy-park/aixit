"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  loadMinutesStore, 
  createMinutesFolder, 
  deleteMinutesFolder, 
  updateMinutesFolder, 
  deleteMeetingMinute,
  moveMeetingMinuteToFolder,
  type MinutesFolder,
  type MeetingMinute,
  type MinuteIconType
} from "@/lib/minutes-store";
import { uploadMinuteAttachment, getMinuteAttachmentUrl, deleteMinuteAttachment } from "@/lib/minutes-storage";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { FolderSectionAccordionHeader } from "@/components/dashboard/FolderSectionAccordionHeader";
import { FolderSectionToolbar } from "@/components/dashboard/FolderSectionToolbar";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { FolderFormModal } from "@/components/dashboard/FolderFormModal";
import { FolderSummaryEditor } from "./FolderSummaryEditor";
import { InlineMinuteView } from "./InlineMinuteView";
import { formatFolderToMarkdown, copyMarkdownToClipboard } from "@/lib/export-md";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { cn } from "@/components/ui/cn";
import { CalendarIcon, VideoIcon, MailIcon, FileTextIcon, LinkIcon, PaperclipIcon, PlusIcon, XIcon, MessageSquareIcon, CopyIcon } from "lucide-react";

function FaviconImage({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const getFaviconUrl = (u: string) => {
    try { 
      const parsed = new URL(u);
      const hostname = parsed.hostname;
      const pathname = parsed.pathname;

      if (hostname === 'docs.google.com') {
        if (pathname.startsWith('/spreadsheets')) return 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico';
        if (pathname.startsWith('/document')) return 'https://ssl.gstatic.com/docs/documents/share/images/favicon3.ico';
        if (pathname.startsWith('/presentation')) return 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico';
        if (pathname.startsWith('/forms')) return 'https://ssl.gstatic.com/docs/forms/favicon_qp2.png';
      }
      if (hostname === 'drive.google.com') return 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png';

      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`; 
    }
    catch { return null; }
  };
  const favUrl = getFaviconUrl(url);

  if (!favUrl || error) return <LinkIcon className="w-4 h-4 shrink-0" />;
  return <img src={favUrl} alt="" className="w-4 h-4 shrink-0 rounded-sm bg-white" onError={() => setError(true)} />;
}


export function MinutesView() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [expandedMinuteId, setExpandedMinuteId] = useState<string | null>(null);
  const [folders, setFolders] = useState<MinutesFolder[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "edit";
    initial: DashboardFolderRecord | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);

  // 드래그&드롭 상태
  const [draggingMinuteId, setDraggingMinuteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const store = loadMinutesStore();
    setFolders(store.folders);
    setMinutes(store.minutes);
  }, []);

  useEffect(() => {
    refreshData();
    const onUpdate = () => refreshData();
    window.addEventListener("aixit-minutes-updated", onUpdate);
    setReady(true);
    return () => window.removeEventListener("aixit-minutes-updated", onUpdate);
  }, [refreshData]);

  const visibleFolders = useMemo(() => folders.filter((f) => !f.hidden).sort((a,b) => a.order - b.order), [folders]);

  useEffect(() => {
    if (!ready) return;
    setExpandedFolders(prev => {
      const next = { ...prev };
      let changed = false;
      for (const f of visibleFolders) {
        if (next[f.id] === undefined) {
          next[f.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [ready, visibleFolders]);

  const q = search.trim().toLowerCase();
  
  const displayMinutes = useMemo(() => {
    let list = minutes.filter(m => {
      const f = folders.find(x => x.id === m.folderId);
      return f && !f.hidden;
    });
    
    if (q) {
      list = list.filter(m => {
        const folderName = folders.find(f => f.id === m.folderId)?.name || "";
        const hay = `${m.title} ${m.date} ${folderName} ${m.content}`.toLowerCase();
        return hay.includes(q);
      });
    }
    
    // Sort by latest date first, then latest updatedAt
    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [minutes, q, folders]);

  const headerCount = displayMinutes.length;

  const toggleAccordion = useCallback((id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDeleteFolder = useCallback((folderId: string, name: string) => {
    if (!confirm(`'${name}' 폴더와 그 안의 모든 회의록을 삭제하시겠습니까?`)) return;
    deleteMinutesFolder(folderId);
    refreshData();
  }, [refreshData]);

  // 드래그&드롭 핸들러
  const handleMinuteDragStart = useCallback((e: React.DragEvent, minuteId: string) => {
    setDraggingMinuteId(minuteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", minuteId);
  }, []);

  const handleMinuteDragEnd = useCallback(() => {
    setDraggingMinuteId(null);
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    if (!draggingMinuteId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  }, [draggingMinuteId]);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    // relatedTarget이 드롭 영역 내부로 이동한 경우는 무시
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    setDragOverFolderId(null);
  }, []);

  const handleFolderDrop = useCallback((e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    const minuteId = e.dataTransfer.getData("text/plain") || draggingMinuteId;
    if (!minuteId) return;
    setDragOverFolderId(null);
    setDraggingMinuteId(null);
    const moved = moveMeetingMinuteToFolder(minuteId, targetFolderId);
    if (moved) {
      setExpandedMinuteId(null);
      refreshData();
    }
  }, [draggingMinuteId, refreshData]);

  const handleFolderFormSave = (data: any) => {
    if (folderModal?.mode === "create") {
      const folder = createMinutesFolder(data.name || "새 폴더");
      if (data.imageDataUrl) {
        updateMinutesFolder(folder.id, { iconUrl: data.imageDataUrl });
      }
    } else if (folderModal?.mode === "edit" && folderModal.initial) {
      updateMinutesFolder(folderModal.initial.id, {
        name: data.name,
        iconUrl: data.iconType === "image_url" || data.iconType === "image_upload" ? data.imageDataUrl : undefined,
      });
    }
    setFolderModal(null);
    refreshData();
  };

  // --- Folder Attachments & Links Handlers ---
  const handleAddFolderLink = (folderId: string) => {
    const url = prompt("링크 주소를 입력하세요 (http://...)");
    if (!url) return;
    const title = prompt("링크 제목을 입력하세요") || url;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const links = folder.links || [];
    updateMinutesFolder(folderId, { links: [...links, { id: Math.random().toString(36).slice(2), url, title }] });
    refreshData();
  };

  const handleDeleteFolderLink = (folderId: string, linkId: string) => {
    if (!confirm("링크를 삭제하시겠습니까?")) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const links = (folder.links || []).filter(l => l.id !== linkId);
    updateMinutesFolder(folderId, { links });
    refreshData();
  };

  const handleFolderFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadingFolderId) return;
    const files = e.target.files;
    if (!files || files.length === 0) {
      setUploadingFolderId(null);
      return;
    }
    
    const folderId = uploadingFolderId;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      setUploadingFolderId(null);
      return;
    }

    try {
      const newAtts = [...(folder.attachments || [])];
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
      updateMinutesFolder(folderId, { attachments: newAtts });
      refreshData();
    } catch (err) {
      console.error(err);
      alert("파일 첨부 중 오류가 발생했습니다.");
    } finally {
      setUploadingFolderId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFolderAttachment = async (folderId: string, attId: string, path?: string) => {
    if (!confirm("첨부파일을 삭제하시겠습니까?")) return;
    if (path) {
      await deleteMinuteAttachment(path);
    }
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const attachments = (folder.attachments || []).filter(a => a.id !== attId);
    updateMinutesFolder(folderId, { attachments });
    refreshData();
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

  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-600">불러오는 중…</div>;
  }

  return (
    <>
      <AdaptivePageHeader
        title="회의록"
        count={headerCount}
        description="주제별 폴더로 회의록을 관리하고 쉽게 찾아볼 수 있습니다."
        hideOnMobile
        rightSlot={
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setFolderModal({ mode: "create", initial: null })} 
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <PlusIcon className="w-4 h-4" /> 폴더 추가
            </button>
          </div>
        }
      />

      <AppMainColumn className="min-w-0 pb-24 text-sm leading-relaxed text-zinc-900">
        <div className="mb-6 space-y-4">
          <DashboardPageHeader
            allWorkflowCount={headerCount}
            folders={visibleFolders.map(f => ({
              id: f.id,
              name: f.name,
              iconType: f.iconUrl ? "image_url" : "emoji",
              emoji: "📁",
              imageDataUrl: f.iconUrl,
              color: "#64748b",
              workflowCount: minutes.filter(m => m.folderId === f.id).length
            }))}
            activeFolderId={activeFolderId || ""}
            onFolderChange={(id: string) => {
              if (id === activeFolderId) {
                setActiveFolderId(null);
                setExpandedMinuteId(null);
                setExpandedFolders(visibleFolders.reduce((acc, f) => ({ ...acc, [f.id]: true }), {}));
              } else {
                setActiveFolderId(id);
                setExpandedMinuteId(null);
                setExpandedFolders({ [id]: true });
              }
            }}
            onAddFolderClick={() => setFolderModal({ mode: "create", initial: null })}
            hiddenFolderRecords={folders.filter(f => f.hidden).map(f => ({
              id: f.id,
              name: f.name,
              iconType: f.iconUrl ? "image_url" : "emoji",
              emoji: "📁",
              imageDataUrl: f.iconUrl,
              color: "#64748b",
              workflowCount: 0
            }))}
            onUnhideHiddenFolder={(id) => {
              updateMinutesFolder(id, { hidden: false });
              refreshData();
            }}
            onDeleteHiddenFolderRequest={(folder) => {
              handleDeleteFolder(folder.id, folder.name);
            }}
          />
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1">
              <PillSearchField
                value={search}
                onChange={setSearch}
                placeholder="회의 제목·내용·폴더명 검색"
              />
            </div>
            <a
              href="https://chatgpt.com/g/g-6a27abbc3d308191bfacd0886bd8c962-aixit-hoeyirog"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 rounded-full font-semibold text-sm transition shrink-0 border border-zinc-200"
            >
              ✏️ AIXIT 회의록
            </a>
          </div>
        </div>

        {visibleFolders.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 mt-8">
            <span className="text-zinc-400">폴더가 없습니다. 우측 상단의 '폴더 추가' 버튼을 눌러보세요.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {visibleFolders.map((folder) => {
              if (activeFolderId && folder.id !== activeFolderId) return null;
              const fMinutes = displayMinutes.filter(m => m.folderId === folder.id);
              const isExpanded = expandedFolders[folder.id];
              
              const dr: DashboardFolderRecord = {
                id: folder.id,
                name: folder.name,
                hidden: folder.hidden,
                iconType: folder.iconUrl ? "image_url" : "emoji",
                imageDataUrl: folder.iconUrl,
                emoji: "📁",
                color: "#64748b",
              };

              const links = folder.links || [];
              const attachments = folder.attachments || [];
              const hasFolderData = links.length > 0 || attachments.length > 0;

              return (
                <div
                  key={folder.id}
                  className={[
                    "flex flex-col gap-2 rounded-2xl transition-all duration-150",
                    dragOverFolderId === folder.id && draggingMinuteId
                      ? "ring-2 ring-blue-400 ring-offset-2 bg-blue-50/30"
                      : "",
                  ].join(" ")}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                >
                  <div className="group relative pr-4">
                    <FolderSectionAccordionHeader
                      folder={dr}
                      count={fMinutes.length}
                      expanded={isExpanded}
                      onToggle={() => toggleAccordion(folder.id)}
                      actions={
                        <FolderSectionToolbar
                          folder={dr}
                          entityLabel="folder"
                          onOpenEdit={(focus) => setFolderModal({ mode: "edit", initial: folder as any })}
                          onToggleHidden={() => {
                            updateMinutesFolder(folder.id, { hidden: true });
                            refreshData();
                          }}
                          onDelete={() => handleDeleteFolder(folder.id, folder.name)}
                        />
                      }
                    />
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-3 pl-2 sm:pl-4 mb-4">
                      {/* 폴더 공통 자료 영역 */}
                      <details className="group rounded-xl border border-zinc-200 bg-zinc-50/50 mb-2" open>
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                            <PaperclipIcon className="w-4 h-4 text-zinc-500" /> 관련 링크 및 계약서
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                              <button
                                onClick={(e) => { e.preventDefault(); handleAddFolderLink(folder.id); }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-md"
                              >
                                + 링크
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setUploadingFolderId(folder.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={uploadingFolderId === folder.id}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 px-2 py-1 rounded-md disabled:opacity-50"
                              >
                                + 파일
                              </button>
                            </div>
                            <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </summary>
                        
                        <div className="px-4 pb-4 border-t border-zinc-100 pt-3">
                          {!hasFolderData ? (
                            <p className="text-xs text-zinc-400">등록된 공통 링크나 자료가 없습니다.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {links.map((link) => (
                                <div key={link.id} className="flex items-center justify-between group/link rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200">
                                  <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-700 hover:underline min-w-0 flex-1">
                                    <FaviconImage url={link.url} />
                                    <span className="truncate">{link.title}</span>
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFolderLink(folder.id, link.id)}
                                    className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover/link:opacity-100"
                                    title="삭제"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {attachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between group/att rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200">
                                  <button
                                    onClick={() => handleDownloadAttachment(att.storagePath)}
                                    className="flex items-center gap-2 text-blue-700 hover:underline min-w-0 flex-1 text-left"
                                  >
                                    <FileTextIcon className="w-4 h-4 shrink-0 text-blue-400" />
                                    <span className="truncate">{att.name}</span>
                                    <span className="text-xs text-zinc-400 ml-1 shrink-0">({Math.round(att.size / 1024)} KB)</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFolderAttachment(folder.id, att.id, att.storagePath)}
                                    className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover/att:opacity-100"
                                    title="삭제"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3">
                            <FolderSummaryEditor 
                              initialSummary={folder.summary}
                              onSave={(val) => {
                                updateMinutesFolder(folder.id, { summary: val });
                                refreshData();
                              }}
                            />
                          </div>
                        </div>
                      </details>

                      {/* 폴더 내 회의록 추가 및 전체 복사 버튼 */}
                      <div className="flex justify-end gap-2 mb-2 pr-4">
                        <button
                          onClick={async () => {
                            const md = formatFolderToMarkdown(folder.name, fMinutes);
                            const ok = await copyMarkdownToClipboard(md);
                            if (ok) alert("폴더 전체 회의록이 마크다운으로 복사되었습니다!");
                          }}
                          className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition"
                        >
                          <CopyIcon className="w-4 h-4" /> 전체 복사
                        </button>
                        <button
                          onClick={() => setExpandedMinuteId("new")}
                          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <PlusIcon className="w-4 h-4" /> 회의록 추가
                        </button>
                      </div>

                      {/* 회의록 리스트 (세로형) */}
                      <div className="flex flex-col gap-2">
                        {expandedMinuteId === "new" && (
                          <div className="mb-4 rounded-xl border border-zinc-200 overflow-hidden">
                            <InlineMinuteView 
                              folderId={folder.id} 
                              minuteId="new" 
                              onClose={() => {
                                setExpandedMinuteId(null);
                                refreshData();
                              }} 
                            />
                          </div>
                        )}
                        {fMinutes.length === 0 && expandedMinuteId !== "new" ? (
                          <div className="py-6 text-center text-zinc-400 bg-white rounded-xl border border-zinc-200 border-dashed">
                            이 폴더에 회의록이 없습니다.
                          </div>
                        ) : (
                          fMinutes.map((minute) => (
                            <div
                              key={minute.id}
                              className={["flex flex-col gap-2 transition-opacity duration-150", draggingMinuteId === minute.id ? "opacity-40" : ""].join(" ")}
                              draggable
                              onDragStart={(e) => handleMinuteDragStart(e, minute.id)}
                              onDragEnd={handleMinuteDragEnd}
                            >
                              <button
                                onClick={() => setExpandedMinuteId(expandedMinuteId === minute.id ? null : minute.id)}
                                className={`group flex items-center justify-between bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition cursor-grab active:cursor-grabbing ${expandedMinuteId === minute.id ? "border-blue-300 shadow-sm" : "border-zinc-200"}`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                  {minute.iconType === "meet" && <VideoIcon className="w-5 h-5 shrink-0 text-emerald-500" />}
                                  {minute.iconType === "email" && <MailIcon className="w-5 h-5 shrink-0 text-amber-500" />}
                                  {minute.iconType === "chat" && <MessageSquareIcon className="w-5 h-5 shrink-0 text-blue-500" />}
                                  {(!minute.iconType || minute.iconType === "default") && <FileTextIcon className="w-5 h-5 shrink-0 text-zinc-400" />}
                                  
                                  <span className="font-medium text-zinc-900 truncate">
                                    {minute.title.trim() || "제목 없음"}
                                  </span>

                                  <div className="hidden sm:flex items-center gap-2 ml-4 shrink-0">
                                    {minute.attachments && minute.attachments.length > 0 && (
                                      <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                        <PaperclipIcon className="w-3 h-3" /> {minute.attachments.length}
                                      </span>
                                    )}
                                    {minute.links && minute.links.length > 0 && (
                                      <span className="flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                        <LinkIcon className="w-3 h-3" /> {minute.links.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium group-hover:text-blue-500 transition">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    {minute.date}
                                  </div>
                                </div>
                              </button>
                              
                              {expandedMinuteId === minute.id && (
                                <div className="rounded-xl border border-zinc-200 overflow-hidden mb-2">
                                  <InlineMinuteView 
                                    folderId={folder.id} 
                                    minuteId={minute.id} 
                                    onClose={() => {
                                      setExpandedMinuteId(null);
                                      refreshData();
                                    }} 
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AppMainColumn>

      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        onChange={handleFolderFileChange}
      />

      {folderModal && (
        <FolderFormModal
          open={true}
          onClose={() => setFolderModal(null)}
          onSave={handleFolderFormSave}
          initial={folderModal.initial}
          mode={folderModal.mode}
        />
      )}
    </>
  );
}
