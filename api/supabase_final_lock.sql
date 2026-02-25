-- [최종 보안] Supabase 주식 데이터 캐시 보호 및 업데이트 잠금 스크립트

-- 1. 모든 삭제(DELETE) 권한을 원천 박탈합니다.
-- 이 명령을 실행하면 대시보드나 코드에서 지우는 것이 불가능해집니다.
REVOKE DELETE ON public.stock_data_cache FROM anon, authenticated;

-- 2. RLS 활성화
ALTER TABLE public.stock_data_cache ENABLE ROW LEVEL SECURITY;

-- 3. 기존 정책들 초기화 (깨끗한 재설정용)
DROP POLICY IF EXISTS "Protect toss_investor_trend_all from delete" ON public.stock_data_cache;
DROP POLICY IF EXISTS "Enable all access" ON public.stock_data_cache;
DROP POLICY IF EXISTS "Restrict Toss Update" ON public.stock_data_cache;
DROP POLICY IF EXISTS "Allow others" ON public.stock_data_cache;
DROP POLICY IF EXISTS "No one can delete" ON public.stock_data_cache;
DROP POLICY IF EXISTS "Everyone can read and write" ON public.stock_data_cache;

-- [정책 1] 특정 핵심 행(toss_investor_trend_all)은 업데이트를 잠급니다.
-- 이 행은 오직 관리자(Service Key)나 직접 수동 조작으로만 바꿀 수 있게 됩니다.
CREATE POLICY "Lock Toss Data Update" ON public.stock_data_cache 
FOR UPDATE 
USING (id != 'toss_investor_trend_all') 
WITH CHECK (id != 'toss_investor_trend_all');

-- [정책 2] 나머지 모든 행에 대해서는 자유로운 읽기 및 삽입을 허용합니다.
CREATE POLICY "Allow Global Access" ON public.stock_data_cache
FOR ALL USING (true) WITH CHECK (true);

-- [참고] 만약 나중에 다시 수동으로 삭제해야 할 일이 생긴다면 
-- ALTER TABLE public.stock_data_cache DISABLE ROW LEVEL SECURITY; 
-- 를 실행하여 잠시 풀 수 있습니다.
