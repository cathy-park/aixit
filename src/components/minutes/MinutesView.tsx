"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  loadMinutesStore, 
  createMinutesFolder, 
  deleteMinutesFolder, 
  updateMinutesFolder, 
  deleteMeetingMinute,
  type MinutesFolder,
  type MeetingMinute
} from "@/lib/minutes-store";
import { AdaptivePageHeader } from "@/components/layout/AdaptivePageHeader";
import { AppMainColumn } from "@/components/layout/AppMainColumn";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PillSearchField } from "@/components/ui/PillSearchField";
import { WORKSPACE_HEADER_ADD_MATCH_BTN } from "@/components/workspace/WorkspaceLinksMemosSections";
import { MeetingMinuteCard } from "@/components/minutes/MeetingMinuteCard";
import type { FolderBarItem } from "@/components/dashboard/DashboardFolderBar";
import { FolderFormModal } from "@/components/dashboard/FolderFormModal";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";
import { pickDefaultMemoFolderId } from "@/lib/memo-folders-store";

export function MinutesView() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [folders, setFolders] = useState<MinutesFolder[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [activeFolderId, setActiveFolderId] = useState("all");
  const [search, setSearch] = useState("");
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "edit";
    initial: DashboardFolderRecord | null;
    editFocus?: "name" | "icon" | "color";
  } | null>(null);

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

  useEffect(() => {
    if (activeFolderId === "all") return;
    const f = folders.find((x) => x.id === activeFolderId);
    if (f?.hidden) setActiveFolderId("all");
  }, [activeFolderId, folders]);

  const visibleFolders = useMemo(() => folders.filter((f) => !f.hidden), [folders]);
  const hiddenFolders = useMemo(() => folders.filter((f) => f.hidden), [folders]);
  const hiddenFolderIds = useMemo(() => new Set(hiddenFolders.map(f => f.id)), [hiddenFolders]);

  const allVisibleMinutesCount = useMemo(
    () => minutes.filter((m) => !hiddenFolderIds.has(m.folderId)).length,
    [minutes, hiddenFolderIds]
  );

  const folderBarItems: FolderBarItem[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) counts[f.id] = 0;
    for (const m of minutes) {
      if (hiddenFolderIds.has(m.folderId)) continue;
      counts[m.folderId] = (counts[m.folderId] ?? 0) + 1;
    }
    return visibleFolders.map((f) => ({
      id: f.id,
      name: f.name,
      order: f.order,
      hidden: f.hidden,
      iconType: f.iconUrl ? "image_url" : "emoji",
      imageDataUrl: f.iconUrl,
      emoji: "📁",
      color: "#64748b",
      workflowCount: counts[f.id] ?? 0,
    }));
  }, [folders, minutes, visibleFolders, hiddenFolderIds]);

  const hiddenFolderRecords: DashboardFolderRecord[] = useMemo(() => {
    return hiddenFolders.map(f => ({
      id: f.id,
      name: f.name,
      order: f.order,
      hidden: f.hidden,
      iconType: f.iconUrl ? "image_url" : "emoji",
      imageDataUrl: f.iconUrl,
      emoji: "📁",
      color: "#64748b",
    }));
  }, [hiddenFolders]);

  const q = search.trim().toLowerCase();
  
  const displayMinutes = useMemo(() => {
    let list = minutes;
    if (activeFolderId !== "all") {
      list = list.filter(m => m.folderId === activeFolderId);
    } else {
      list = list.filter(m => !hiddenFolderIds.has(m.folderId));
    }
    
    if (q) {
      list = list.filter(m => {
        const folderName = folders.find(f => f.id === m.folderId)?.name || "";
        const hay = `${m.title} ${m.date} ${folderName} ${m.content}`.toLowerCase();
        return hay.includes(q);
      });
    }
    
    // Sort by most recently updated
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [minutes, activeFolderId, hiddenFolderIds, q, folders]);

  const headerCount = displayMinutes.length;

  const handleCreateMinute = () => {
    let targetFolderId = activeFolderId;
    if (targetFolderId === "all") {
      if (visibleFolders.length > 0) {
        targetFolderId = visibleFolders[0].id;
      } else {
        alert("회의록을 생성할 폴더가 없습니다. 폴더를 먼저 만들어주세요.");
        return;
      }
    }
    router.push(`/minutes/${targetFolderId}/new`);
  };

  const handleToggleFolderHidden = useCallback(
    (f: DashboardFolderRecord) => {
      updateMinutesFolder(f.id, { hidden: !f.hidden });
      refreshData();
    },
    [refreshData],
  );

  const handleDeleteFolder = useCallback(
    (folder: DashboardFolderRecord) => {
      if (!confirm(`'${folder.name}' 폴더와 그 안의 모든 회의록을 삭제하시겠습니까?`)) return;
      deleteMinutesFolder(folder.id);
      refreshData();
      if (activeFolderId === folder.id) setActiveFolderId("all");
    },
    [activeFolderId, refreshData],
  );

  const handleDeleteMinute = useCallback(
    (id: string) => {
      if (!confirm("이 회의록을 삭제하시겠습니까?")) return;
      deleteMeetingMinute(id);
      refreshData();
    },
    [refreshData],
  );

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

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-600">불러오는 중…</div>
    );
  }

  return (
    <>
      <AdaptivePageHeader
        title="회의록"
        count={headerCount}
        description="주제별 폴더로 회의록을 관리하고 쉽게 찾아볼 수 있습니다."
        hideOnMobile
        rightSlot={
          <button type="button" onClick={handleCreateMinute} className={WORKSPACE_HEADER_ADD_MATCH_BTN}>
            추가
          </button>
        }
      />

      <AppMainColumn className="min-w-0 pb-24 text-sm leading-relaxed text-zinc-900">
        <div className="mb-6 space-y-4">
          <DashboardPageHeader
            allWorkflowCount={allVisibleMinutesCount}
            folders={folderBarItems}
            activeFolderId={activeFolderId}
            onFolderChange={setActiveFolderId}
            onAddFolderClick={() => setFolderModal({ mode: "create", initial: null })}
            hiddenFolderRecords={hiddenFolderRecords}
            onUnhideHiddenFolder={(id) => {
              updateMinutesFolder(id, { hidden: false });
              refreshData();
            }}
            onDeleteHiddenFolderRequest={handleDeleteFolder}
            onFolderOpenEdit={(f, focus) => setFolderModal({ mode: "edit", initial: f, editFocus: focus })}
            onFolderToggleHidden={handleToggleFolderHidden}
            onFolderDeleteRequest={handleDeleteFolder}
            onReorderFolders={(dragId, beforeId) => {
              // Order mapping is a bit complex, we can leave reorder out or implement it
              // For simplicity, we just trigger refresh. Order logic needs store update.
            }}
          />

          <PillSearchField
            value={search}
            onChange={setSearch}
            placeholder="회의 제목·내용·폴더명 검색"
          />
        </div>

        {displayMinutes.length > 0 ? (
          <div className="grid w-full grid-flow-row gap-4 grid-cols-1 @min-[800px]:grid-cols-2 @min-[1200px]:grid-cols-3 @min-[1600px]:grid-cols-4">
            {displayMinutes.map((minute) => {
              const folder = folders.find(f => f.id === minute.folderId);
              if (!folder) return null;
              return (
                <MeetingMinuteCard
                  key={minute.id}
                  minute={minute}
                  folder={folder}
                  onDelete={() => handleDeleteMinute(minute.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 mt-8">
            <span className="text-zinc-400">
              {q ? "검색 결과가 없습니다." : "이 폴더에 회의록이 없어요. 우측 상단의 '추가' 버튼을 눌러보세요."}
            </span>
          </div>
        )}
      </AppMainColumn>

      {folderModal && (
        <FolderFormModal
          open={true}
          onClose={() => setFolderModal(null)}
          onSave={handleFolderFormSave}
          initial={folderModal.initial}
          mode={folderModal.mode}
          highlightSection={folderModal.editFocus}
        />
      )}
    </>
  );
}
