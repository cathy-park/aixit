"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderIcon, PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { loadMinutesStore, createMinutesFolder, deleteMinutesFolder, updateMinutesFolder, type MinutesFolder } from "@/lib/minutes-store";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";

export default function MinutesFoldersPage() {
  const [folders, setFolders] = useState<MinutesFolder[]>([]);

  useEffect(() => {
    const onUpdate = () => {
      setFolders(loadMinutesStore().folders);
    };
    window.addEventListener("aixit-minutes-updated", onUpdate);
    onUpdate();
    return () => window.removeEventListener("aixit-minutes-updated", onUpdate);
  }, []);

  const handleCreate = () => {
    const name = prompt("새 회의록 폴더 이름을 입력하세요:");
    if (!name) return;
    createMinutesFolder(name);
  };

  const handleEdit = (id: string, oldName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const name = prompt("새로운 이름을 입력하세요:", oldName);
    if (!name || name === oldName) return;
    updateMinutesFolder(id, name);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`'${name}' 폴더와 그 안의 모든 회의록을 삭제하시겠습니까?`)) return;
    deleteMinutesFolder(id);
  };

  return (
    <AppMainColumn>
      <AdaptivePageHeader title="회의록" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">회의록 폴더</h1>
            <p className="mt-1 text-sm text-zinc-500">프로젝트나 주제별로 회의록을 관리하세요.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition"
          >
            <PlusIcon className="w-4 h-4" />새 폴더
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
              <FolderIcon className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900">폴더가 없습니다</h3>
            <p className="mt-1 text-sm text-zinc-500">우측 상단의 버튼을 눌러 첫 회의록 폴더를 만들어 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/minutes/${folder.id}`}
                className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => handleEdit(folder.id, folder.name, e)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
                      title="이름 수정"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(folder.id, folder.name, e)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900 line-clamp-1">{folder.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(folder.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppMainColumn>
  );
}
