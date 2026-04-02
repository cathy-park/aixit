import type { DashboardFolderIconType } from "@/lib/dashboard-folders-store";
import type { WorkspaceStep } from "@/lib/workspace-store";

/** STEP JSON 일부만 있어도 추론 가능 */
export type StepNavigatorStoredFields = Pick<
  WorkspaceStep,
  "navigatorIconType" | "navigatorLucideIcon" | "fallbackEmoji" | "fallbackColor" | "fallbackImageUrl"
>;

export type StepNavigatorPickerTab = "default" | "image_url" | "image_upload";

export type StepNavigatorPickerState = {
  tab: StepNavigatorPickerTab;
  iconType: DashboardFolderIconType;
  lucideIcon: string;
  emoji: string;
  imageDataUrl: string;
  color: string;
};

const DEFAULT_COLOR = "#27272a";

function safeHex(c: string | undefined): string {
  const t = c?.trim() ?? "";
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(t) ? t : DEFAULT_COLOR;
}

/** 저장된 STEP 필드 → IconPicker + 색상 UI 초기값 */
export function stepToNavigatorPickerState(step: StepNavigatorStoredFields): StepNavigatorPickerState {
  const color = safeHex(step.fallbackColor);
  const t = step.navigatorIconType;

  if (t === "image_url" || t === "image_upload") {
    return {
      tab: t === "image_upload" ? "image_upload" : "image_url",
      iconType: t,
      lucideIcon: step.navigatorLucideIcon?.trim() || "FolderOpen",
      emoji: step.fallbackEmoji || "📁",
      imageDataUrl: step.fallbackImageUrl?.trim() ?? "",
      color,
    };
  }

  if (t === "emoji") {
    return {
      tab: "default",
      lucideIcon: step.navigatorLucideIcon?.trim() || "FolderOpen",
      iconType: "lucide",
      emoji: step.fallbackEmoji || "📁",
      imageDataUrl: "",
      color,
    };
  }

  if (t === "lucide") {
    return {
      tab: "default",
      iconType: "lucide",
      lucideIcon: step.navigatorLucideIcon?.trim() || "FolderOpen",
      emoji: step.fallbackEmoji || "📁",
      imageDataUrl: "",
      color,
    };
  }

  if (step.fallbackImageUrl?.trim()) {
    const url = step.fallbackImageUrl.trim();
    const isData = url.startsWith("data:");
    return {
      tab: isData ? "image_upload" : "image_url",
      iconType: isData ? "image_upload" : "image_url",
      lucideIcon: "FolderOpen",
      emoji: "📁",
      imageDataUrl: url,
      color,
    };
  }

  if (step.fallbackEmoji?.trim()) {
    return {
      tab: "default",
      iconType: "emoji",
      lucideIcon: "FolderOpen",
      emoji: step.fallbackEmoji.trim(),
      imageDataUrl: "",
      color,
    };
  }

  return {
    tab: "default",
    iconType: "lucide",
    lucideIcon: "FolderOpen",
    emoji: "📁",
    imageDataUrl: "",
    color,
  };
}

/** IconPicker 상태 → STEP에 넣을 navigator 관련 필드 */
export function navigatorPickerStateToStepPatch(s: StepNavigatorPickerState): Pick<
  WorkspaceStep,
  "navigatorIconType" | "navigatorLucideIcon" | "fallbackEmoji" | "fallbackColor" | "fallbackImageUrl"
> {
  if (s.tab === "image_url" || s.tab === "image_upload") {
    return {
      navigatorIconType: s.tab === "image_upload" ? "image_upload" : "image_url",
      navigatorLucideIcon: null,
      fallbackImageUrl: s.imageDataUrl.trim() || undefined,
      fallbackColor: s.color,
      fallbackEmoji: undefined,
    };
  }

  return {
    navigatorIconType: "lucide",
    navigatorLucideIcon: s.lucideIcon || "FolderOpen",
    fallbackColor: s.color,
    fallbackEmoji: undefined,
    fallbackImageUrl: undefined,
  };
}
