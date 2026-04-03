import { listWorkflowTemplates, type WorkflowTemplateListItem } from "@/lib/aixit-data";
import { getWorkflowTemplateCategoryOverride } from "@/lib/workflow-template-category-override-store";
import {
  getWorkflowTemplateCategoryLabelStatic,
  loadWorkflowTemplateFolders,
} from "@/lib/workflow-template-folders-store";
import { loadRemovedWorkflowTemplateIds } from "@/lib/user-removed-workflow-templates-store";
import { listUserWorkflowTemplateListItems } from "@/lib/user-workflow-templates-store";

/**
 * 워크플로우 라이브러리 메뉴와 동일 기준(사용자 템플릿 + 내장, 숨김 제외, 폴더 라벨·카테고리 오버라이드 반영).
 */
export function listWorkflowTemplatesForMenu(): WorkflowTemplateListItem[] {
  if (typeof window === "undefined") return [];
  const removed = loadRemovedWorkflowTemplateIds();
  const folders = loadWorkflowTemplateFolders();
  const labelById = Object.fromEntries(folders.map((f) => [f.id, f.name]));
  const userItems = listUserWorkflowTemplateListItems()
    .filter((t) => !removed.has(t.templateId))
    .map((t) => ({
      ...t,
      categoryLabel: labelById[t.categoryId] ?? getWorkflowTemplateCategoryLabelStatic(t.categoryId),
    }));
  const builtin = listWorkflowTemplates()
    .filter((t) => !removed.has(t.templateId))
    .map((t) => {
      const categoryId = getWorkflowTemplateCategoryOverride(t.templateId) ?? t.categoryId;
      return {
        ...t,
        categoryId,
        categoryLabel: labelById[categoryId] ?? getWorkflowTemplateCategoryLabelStatic(categoryId),
      };
    });
  return [...userItems, ...builtin];
}
