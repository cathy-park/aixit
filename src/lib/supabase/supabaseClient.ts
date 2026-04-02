import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseEnabled() {
  return Boolean(url && anonKey);
}

export const supabaseEnabled = getSupabaseEnabled();

// 서버/빌드 환경에서는 undefined가 올 수 있어 안전하게 가드합니다.
export const supabase = supabaseEnabled ? createClient(url!, anonKey!) : null;

