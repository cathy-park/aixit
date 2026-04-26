export type AixitStorageSnapshot = {
  schemaVersion: 1;
  takenAt: number;
  sourceOrigin: string;
  values: Record<string, string>;
};

/**
 * 앱이 "persist"로 사용하는 localStorage 키 목록.
 * (IndexedDB / zustand persist 는 사용하지 않는 것으로 확인됨)
 */
export const AIXIT_LOCAL_STORAGE_KEYS = [
  "aixit.userWorkflowTemplates.v1",
  "aixit.dashboardWorkflows.v1",
  "aixit.pinnedInspirationIds.v1",
  "aixit.pinnedToolIds.v1",
  "aixit.todayTodos.v1",
  "aixit.workflowTemplateFolders.v1",
  "aixit.dashboardFolders.v1",
  "aixit.memoFolders.v1",
  "aixit.memoFolderDomainSplit.v1",
  "aixit.memoCategoryFolderSync.v1",
  "aixit.workflowTemplateDisplayOrder.v1",
  "aixit.removedWorkflowTemplateIds.v1",
  "aixit.homeGreetingName.v1",
  "aixit.pinnedWorkflowKeys.v1",
  "aixit.toolOverrides.v1",
  "aixit.userTools.v1",
  "aixit.deletedBuiltinToolIds.v1",
  "aixit.dismissedBuiltinWorkflows.v1",
  "aixit.dashboardLayout.v1",
  "aixit.ideaNotes.v1",
  "aixit.memoLayout.v1",
  "aixit.pinnedIdeaNoteIds.v1",
] as const;

const AUTO_MIGRATION_MARKER_PREFIX = "aixit.storageMigration.autoApplied.v1.";

export function getAutoMigrationMarkerKey(destOrigin: string) {
  return `${AUTO_MIGRATION_MARKER_PREFIX}${destOrigin}`;
}

export function loadAixitLocalStorageSnapshot(): AixitStorageSnapshot {
  const values: Record<string, string> = {};
  if (typeof window === "undefined") return { schemaVersion: 1, takenAt: Date.now(), sourceOrigin: "", values };

  for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v != null) values[k] = v;
  }

  return {
    schemaVersion: 1,
    takenAt: Date.now(),
    sourceOrigin: window.location.origin,
    values,
  };
}

export function applyAixitLocalStorageSnapshot(snapshot: AixitStorageSnapshot) {
  if (typeof window === "undefined") return;
  if (!snapshot || snapshot.schemaVersion !== 1 || !snapshot.values) return;

  // "전체 데이터 백업/복원" 관점에서 snapshot에 없는 키는 제거합니다.
  for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(snapshot.values, k)) {
      window.localStorage.setItem(k, snapshot.values[k]);
    } else {
      window.localStorage.removeItem(k);
    }
  }

  dispatchAixitStorageUpdatedEvents();
}

export function hasAnyAixitPersistedData(): boolean {
  if (typeof window === "undefined") return false;
  for (const k of AIXIT_LOCAL_STORAGE_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && v.trim().length > 0) return true;
  }
  return false;
}

/**
 * 자동 동기화 판단용: 앱에서 "실사용 데이터"에 해당하는 핵심 키들이 비어 있으면 true.
 * (기타 seed 키들이 미리 만들어져도 자동 import가 막히지 않도록 함)
 */
export function isAixitCoreDataEmpty(): boolean {
  if (typeof window === "undefined") return true;
  const CORE_KEYS = [
    "aixit.dashboardWorkflows.v1",
    "aixit.userWorkflowTemplates.v1",
    "aixit.todayTodos.v1",
    "aixit.dashboardLayout.v1",
  ] as const;

  for (const k of CORE_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && v.trim().length > 0) return false;
  }
  return true;
}

export function dispatchAixitStorageUpdatedEvents() {
  if (typeof window === "undefined") return;

  // workflows / folders / layout
  window.dispatchEvent(new CustomEvent("aixit-workflows-updated"));
  window.dispatchEvent(new CustomEvent("aixit-dashboard-folders-updated"));
  window.dispatchEvent(new CustomEvent("aixit-dashboard-layout-updated"));

  // user workflow templates
  window.dispatchEvent(new Event("aixit-user-workflow-templates-updated"));

  // inspiration
  window.dispatchEvent(new CustomEvent("aixit-inspiration-updated"));
  window.dispatchEvent(new CustomEvent("aixit-pinned-inspiration-updated"));
  window.dispatchEvent(new CustomEvent("aixit-pinned-tools-updated"));

  // today todos
  window.dispatchEvent(new CustomEvent("aixit-today-todos-updated"));

  // template folders + order + library remove
  window.dispatchEvent(new CustomEvent("aixit-workflow-template-folders-updated"));
  window.dispatchEvent(new Event("aixit-workflow-template-order-updated"));
  window.dispatchEvent(new Event("aixit-removed-workflow-templates-updated"));

  // tool catalog overrides + deletion
  window.dispatchEvent(new Event("aixit-tools-catalog-updated"));

  // home greeting (import/export 후 즉시 헤더 갱신용)
  window.dispatchEvent(new Event("aixit-home-greeting-updated"));

  // idea notes (메모 / 인큐베이터)
  window.dispatchEvent(new CustomEvent("aixit-notes-updated"));
}

export const AIXIT_STORAGE_SNAPSHOT_MESSAGE_TYPE = "aixit-storage-snapshot";

