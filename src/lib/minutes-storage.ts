import { set, get, del } from "idb-keyval";
import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";

/**
 * 하이브리드 파일 업로드
 * 1. Supabase 연동되어 있고 세션이 있으면 Supabase Storage (aixit_files 버킷) 사용
 * 2. 아니면 로컬 IndexedDB 사용
 * @returns 저장된 경로(storagePath) 또는 식별자
 */
export async function uploadMinuteAttachment(file: File): Promise<string> {
  // 1. Supabase Storage 시도
  if (supabaseEnabled && supabase) {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const user = session.session.user;
      // 파일 경로: user_id/timestamp_filename
      const filePath = `${user.id}/${Date.now()}_${encodeURIComponent(file.name)}`;
      
      const { error, data } = await supabase.storage
        .from("aixit_files")
        .upload(filePath, file);

      if (!error && data?.path) {
        return `supabase://${data.path}`;
      }
      console.warn("Supabase Storage 업로드 실패, 로컬 IDB로 폴백합니다.", error);
    }
  }

  // 2. IndexedDB 폴백
  const idbKey = `idb://${Date.now()}_${file.name}`;
  await set(idbKey, file);
  return idbKey;
}

/**
 * 하이브리드 파일 다운로드 URL (또는 Blob 객체) 가져오기
 */
export async function getMinuteAttachmentUrl(storagePath: string): Promise<string | null> {
  if (storagePath.startsWith("supabase://")) {
    const path = storagePath.replace("supabase://", "");
    if (!supabase) return null;
    
    const { data, error } = await supabase.storage
      .from("aixit_files")
      .createSignedUrl(path, 60 * 60); // 1시간 유효

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  if (storagePath.startsWith("idb://")) {
    const file = await get<File>(storagePath);
    if (!file) return null;
    return URL.createObjectURL(file);
  }

  return null;
}

/**
 * 첨부파일 삭제
 */
export async function deleteMinuteAttachment(storagePath: string): Promise<boolean> {
  if (storagePath.startsWith("supabase://")) {
    const path = storagePath.replace("supabase://", "");
    if (!supabase) return false;
    
    const { error } = await supabase.storage
      .from("aixit_files")
      .remove([path]);
      
    return !error;
  }

  if (storagePath.startsWith("idb://")) {
    await del(storagePath);
    return true;
  }

  return false;
}
