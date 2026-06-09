"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeftIcon, PlusIcon, FileTextIcon, DownloadIcon, CopyIcon, TrashIcon } from "lucide-react";
import { 
  loadMinutesStore, 
  deleteMeetingMinute, 
  type MinutesFolder, 
  type MeetingMinute 
} from "@/lib/minutes-store";
import { formatFolderToMarkdown, copyMarkdownToClipboard, downloadMarkdownFile } from "@/lib/export-md";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";

export default function FolderMinutesPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = typeof params?.folderId === "string" ? params.folderId : "";

  const [folder, setFolder] = useState<MinutesFolder | null>(null);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);

  useEffect(() => {
    const onUpdate = () => {
      const store = loadMinutesStore();
      const f = store.folders.find((x) => x.id === folderId);
      if (!f) {
        router.replace("/minutes");
        return;
      }
      setFolder(f);
      // 최신순(날짜 내림차순) 정렬
      const m = store.minutes
        .filter((x) => x.folderId === folderId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMinutes(m);
    };

    window.addEventListener("aixit-minutes-updated", onUpdate);
    onUpdate();
    return () => window.removeEventListener("aixit-minutes-updated", onUpdate);
  }, [folderId, router]);

  const handleCopyMarkdown = async () => {
    if (!folder) return;
    const md = formatFolderToMarkdown(folder.name, minutes);
    const ok = await copyMarkdownToClipboard(md);
    if (ok) alert("전체 회의록이 마크다운으로 복사되었습니다!");
  };

  const handleDownloadMarkdown = () => {
    if (!folder) return;
    const md = formatFolderToMarkdown(folder.name, minutes);
    downloadMarkdownFile(`${folder.name}_전체_회의록`, md);
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`'${title}' 회의록을 삭제하시겠습니까?`)) {
      deleteMeetingMinute(id);
    }
  };

  if (!folder) return null;

  return (
    <AppMainColumn>
      <AdaptivePageHeader
        title={folder.name}
        leftNode={
          <Link href="/minutes" className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition">
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{folder.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">이 폴더의 모든 회의록입니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              <CopyIcon className="w-4 h-4" />전체 복사
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              <DownloadIcon className="w-4 h-4" />전체 다운로드
            </button>
            <Link
              href={`/minutes/${folder.id}/new`}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
            >
              <PlusIcon className="w-4 h-4" />새 회의록
            </Link>
          </div>
        </div>

        {minutes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <FileTextIcon className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900">회의록이 없습니다</h3>
            <p className="mt-1 text-sm text-zinc-500">새 회의록을 추가해 보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {minutes.map((m) => (
              <Link
                key={m.id}
                href={`/minutes/${folder.id}/${m.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-blue-600 mb-1">{m.date}</span>
                  <h3 className="text-base font-semibold text-zinc-900">{m.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>첨부파일 {m.attachments?.length || 0}개</span>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 opacity-0 group-hover:opacity-100 transition flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, m.id, m.title)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="삭제"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppMainColumn>
  );
}
