import { DashboardFolderBar, type FolderBarItem } from "@/components/dashboard/DashboardFolderBar";
import { HiddenFoldersManageSection } from "@/components/dashboard/HiddenFoldersManageSection";
import type { DashboardFolderRecord } from "@/lib/dashboard-folders-store";

/** 프로젝트 페이지: 폴더 칩·숨김 영역 (제목·추가 메뉴는 AdaptivePageHeader에서 처리) */
export function DashboardPageHeader({
  allWorkflowCount,
  folders,
  activeFolderId,
  onFolderChange,
  onAddFolderClick,
  onFolderOpenEdit,
  onFolderToggleHidden,
  onFolderDeleteRequest,
  hiddenFolderRecords,
  onUnhideHiddenFolder,
  onDeleteHiddenFolderRequest,
  onReorderFolders,
}: {
  allWorkflowCount: number;
  folders: FolderBarItem[];
  activeFolderId: string;
  onFolderChange: (id: string) => void;
  onAddFolderClick?: () => void;
  onFolderOpenEdit?: (folder: FolderBarItem, focus?: "name" | "icon" | "color") => void;
  onFolderToggleHidden?: (folder: FolderBarItem) => void;
  onFolderDeleteRequest?: (folder: FolderBarItem) => void;
  hiddenFolderRecords: DashboardFolderRecord[];
  onUnhideHiddenFolder: (id: string) => void;
  onDeleteHiddenFolderRequest: (folder: DashboardFolderRecord) => void;
  onReorderFolders?: (dragId: string, beforeId: string | null) => void;
}) {
  return (
    <div className="pb-0">
      <DashboardFolderBar
        variant="project"
        allWorkflowCount={allWorkflowCount}
        folders={folders}
        activeFolderId={activeFolderId}
        onChange={onFolderChange}
        onAddFolderClick={onAddFolderClick}
        onFolderOpenEdit={onFolderOpenEdit}
        onFolderToggleHidden={onFolderToggleHidden}
        onFolderDeleteRequest={onFolderDeleteRequest}
        onReorderFolders={onReorderFolders}
      />
      <HiddenFoldersManageSection
        variant="project"
        folders={hiddenFolderRecords}
        onUnhide={onUnhideHiddenFolder}
        onRequestDelete={onDeleteHiddenFolderRequest}
      />
    </div>
  );
}
