## Supabase 설정 (Google 로그인 + 데이터 동기화)

이 프로젝트는 로컬(localStorage) 데이터를 **Supabase에 유저별로 저장**해서, 다른 컴퓨터에서도 동일하게 보이도록 구성할 수 있습니다.

### 1) Auth Provider: Google 활성화

Supabase Dashboard에서:

- **Authentication → Providers → Google**: Enable
- **Authentication → URL Configuration**:
  - **Site URL**: 개발 중에는 `http://localhost:3001`
  - **Redirect URLs**: 아래를 추가
    - `http://localhost:3001/auth/callback`
    - `http://127.0.0.1:3001/auth/callback`

개발 중 포트를 바꾸면 Redirect URL도 동일하게 추가해야 합니다.

### 2) DB 테이블 + RLS 정책 만들기

Supabase Dashboard → **SQL Editor**에서 아래 SQL을 실행하세요.

```sql
-- user별 KV 스토리지
create table if not exists public.aixit_kv (
  user_id uuid not null references auth.users (id) on delete cascade,
  k text not null,
  v text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);

alter table public.aixit_kv enable row level security;

-- 현재 로그인한 user만 접근 가능
create policy "aixit_kv_select_own"
on public.aixit_kv
for select
to authenticated
using (auth.uid() = user_id);

create policy "aixit_kv_insert_own"
on public.aixit_kv
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "aixit_kv_update_own"
on public.aixit_kv
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "aixit_kv_delete_own"
on public.aixit_kv
for delete
to authenticated
using (auth.uid() = user_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.aixit_kv;
create trigger set_updated_at
before update on public.aixit_kv
for each row execute function public.set_updated_at();
```

### 3) Storage 버킷 추가 (회의록 첨부파일 등)

Supabase Dashboard → **Storage**에서:
1. **New Bucket** 클릭
2. Name: `aixit_files`
3. Public bucket 여부: 프로젝트 보안에 맞게 설정 (로그인한 사람만 보게 하려면 비공개, 누구나 URL로 보게 하려면 Public 체크)

그런 다음 **SQL Editor**에서 파일 접근 권한(RLS)을 부여하세요.

```sql
-- Storage bucket RLS policies for 'aixit_files'
-- 로그인된 사용자만 파일을 업로드/조회/삭제할 수 있도록 설정합니다.

-- 1. Insert (업로드)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'aixit_files');

-- 2. Select (조회/다운로드)
CREATE POLICY "Allow authenticated reads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'aixit_files');

-- 3. Update (수정)
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'aixit_files');

-- 4. Delete (삭제)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'aixit_files');
```

### 4) 환경변수

`.env.local`에 아래를 설정합니다(이미 있으면 그대로 사용).

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

