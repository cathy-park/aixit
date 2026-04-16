import { type Tool } from "@/lib/tools";
import { 
  type InspirationSite, 
  loadInspirationSites, 
  saveInspirationSites,
  addInspirationSite,
  updateInspirationSite 
} from "@/lib/inspiration-store";
import { 
  loadUserTools, 
  saveUserTools, 
  persistTool, 
  removeToolFromStore,
  makeUserToolId
} from "@/lib/user-tools-store";

export type WarehouseType = "tools" | "inspiration" | "chatbots";

/** 도구를 영감/챗봇 창고로 이동 */
export function moveToolToWarehouse(tool: Tool, target: "inspiration" | "chatbots") {
  // 1. 도구 창고에서 제거
  removeToolFromStore(tool.id);

  // 2. 영감 사이트 형식으로 변환
  const newSite: Omit<InspirationSite, "id"> = {
    name: tool.name,
    description: tool.description ?? "",
    url: tool.href ?? "",
    category: target === "chatbots" ? "챗봇" : "영감",
    memo: tool.highlightNote ?? "",
    tags: tool.tags ?? [],
    logoUrl: tool.logoImageUrl ?? "",
    active: true,
    shortcutCount: 0,
  };

  // 3. 영감 창고에 추가
  addInspirationSite(newSite);
  
  // 변경 사항 브로드캐스트 (전역 이벤트 발생은 store 함수 내부에 이미 있음)
  window.dispatchEvent(new Event("aixit-tools-catalog-updated"));
}

/** 영감/챗봇을 다른 창고로 이동 */
export function moveInspirationToWarehouse(site: InspirationSite, target: WarehouseType) {
  if (target === "inspiration" || target === "chatbots") {
    // 같은 영감 저장소를 쓰는 경우 카테고리만 수정
    const nextCategory = target === "chatbots" ? "챗봇" : "영감";
    updateInspirationSite(site.id, { category: nextCategory });
    return;
  }

  // 도구 창고로 이동하는 경우
  // 1. 영감 창고에서 제거
  const sites = loadInspirationSites();
  saveInspirationSites(sites.filter(s => s.id !== site.id));

  // 2. 도구 형식으로 변환
  const newTool: Tool = {
    id: makeUserToolId(),
    name: site.name,
    category: "기타",
    capabilities: [],
    difficulty: "easy",
    recommendedFor: [],
    active: true,
    description: site.description,
    tags: site.tags,
    href: site.url,
    logoImageUrl: site.logoUrl,
    highlightNote: site.memo,
  };

  // 3. 도구 창고에 저장
  persistTool(newTool);
  
  // 변경 사항 브로드캐스트
  window.dispatchEvent(new Event("aixit-inspiration-updated"));
  window.dispatchEvent(new Event("aixit-tools-catalog-updated"));
}
