/** http(s) URL 문자열 여부 (내비게이터 이미지 등) */
export function isHttpUrlString(raw: string | undefined | null): boolean {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const MAX_DATA_URI_CHARS = 2_500_000;

/** 붙여넣은 base64에 줄바꿈·공백이 섞여도 img src로 쓸 수 있게 정리 */
export function normalizeNavigatorImageSource(raw: string): string {
  const t = raw.trim();
  if (/^data:/i.test(t)) {
    return t.replace(/\s/g, "");
  }
  return t;
}

/**
 * data:image (png/jpeg/gif/webp) + base64 페이로드.
 * SVG data URI는 스크립트 위험이 있어 제외.
 */
export function isDataImageBase64Uri(raw: string | undefined | null): boolean {
  const t = typeof raw === "string" ? raw.trim().replace(/\s/g, "") : "";
  if (t.length < 40 || t.length > MAX_DATA_URI_CHARS) return false;
  const m = t.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/i);
  if (!m || !m[2]) return false;
  return m[2].length >= 16;
}

/** 내비게이터 커스텀 아이콘: http(s) 또는 안전한 raster data URI */
export function isNavigatorImageSource(raw: string | undefined | null): boolean {
  if (raw == null || !raw.trim()) return false;
  const normalized = normalizeNavigatorImageSource(raw);
  return isHttpUrlString(normalized) || isDataImageBase64Uri(normalized);
}
