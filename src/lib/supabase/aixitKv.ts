import { supabase, supabaseEnabled } from "@/lib/supabase/supabaseClient";
import { AIXIT_LOCAL_STORAGE_KEYS, isAixitCoreDataEmpty } from "@/lib/aixit-storage";

export type AixitKvRow = { user_id: string; k: string; v: string };

const TABLE = "aixit_kv";

function inKeysFilter(keys: readonly string[]) {
  // supabase-js는 readonly 배열도 받지만, 타입 호환을 위해 복사합니다.
  return [...keys];
}

export async function fetchAixitKvMap(): Promise<Record<string, string>> {
  if (!supabaseEnabled || !supabase) return {};
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const keys = inKeysFilter(AIXIT_LOCAL_STORAGE_KEYS);
  const { data, error } = await supabase.from(TABLE).select("k,v").eq("user_id", user.id).in("k", keys);
  if (error) {
    // 에러를 숨기면 "원격이 비어있다"로만 보여 디버깅이 불가능해집니다.
    throw new Error(`Supabase fetch failed: ${error.message}`);
  }

  const map: Record<string, string> = {};
  if (Array.isArray(data)) {
    for (const row of data as AixitKvRow[]) {
      if (row?.k) map[row.k] = row.v ?? "";
    }
  }
  return map;
}

export async function upsertAixitKv(k: string, v: string) {
  if (!supabaseEnabled || !supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from(TABLE).upsert({ user_id: user.id, k, v }, { onConflict: "user_id,k" });
  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

export async function deleteAixitKv(k: string) {
  if (!supabaseEnabled || !supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from(TABLE).delete().eq("user_id", user.id).eq("k", k);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

export async function flushAixitKvQueue(queue: Map<string, string | null>) {
  if (!supabaseEnabled || !supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entries = [...queue.entries()];
  if (entries.length === 0) return;

  // bulk upsert는 지원하지만, delete는 별도 처리합니다.
  const upserts: Array<{ user_id: string; k: string; v: string }> = [];
  const deletes: string[] = [];
  for (const [k, v] of entries) {
    if (v == null) deletes.push(k);
    else upserts.push({ user_id: user.id, k, v });
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from(TABLE).upsert(upserts, { onConflict: "user_id,k" });
    if (error) {
      throw new Error(`Supabase bulk upsert failed: ${error.message}`);
    }
  }

  if (deletes.length > 0) {
    // 다건 delete는 in 절 사용
    const { error } = await supabase.from(TABLE).delete().eq("user_id", user.id).in("k", deletes);
    if (error) {
      throw new Error(`Supabase bulk delete failed: ${error.message}`);
    }
  }
}

