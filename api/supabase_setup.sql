-- [데이터 증발 방지] Supabase 주식 데이터 캐시 보호 스크립트

-- 1. toss_investor_trend_all 행의 삭제를 원천 봉쇄합니다.
-- (RLS가 활성화되어 있어야 작동합니다.)
ALTER TABLE public.stock_data_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Protect toss_investor_trend_all from delete" ON public.stock_data_cache;
CREATE POLICY "Protect toss_investor_trend_all from delete" 
ON public.stock_data_cache 
FOR DELETE 
USING (id != 'toss_investor_trend_all');

-- 모든 사용자(익명 포함)에게 읽기/쓰기 권한 부여 (삭제만 방금 정책으로 제한)
DROP POLICY IF EXISTS "Enable all access" ON public.stock_data_cache;
CREATE POLICY "Enable all access" ON public.stock_data_cache
FOR ALL USING (true) WITH CHECK (true);


-- 2. 빈 데이터(NULL 또는 빈 객체)가 들어올 경우 업데이트를 거부하고 기존 데이터를 유지하는 트리거 함수
CREATE OR REPLACE FUNCTION protect_empty_investor_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 만약 업데이트하려는 데이터(NEW.data)가 비어있거나 NULL이면 업데이트를 취소하고 이전 데이터(OLD)를 유지함
    IF (NEW.id = 'toss_investor_trend_all') THEN
        IF (NEW.data IS NULL OR NEW.data::text = '{}'::text OR (NEW.data->'buy'->'foreign'->'list')::text = '[]'::text) THEN
            RAISE NOTICE '⚠️ 빈 데이터 감지됨. 업데이트를 거부하고 기존 데이터를 유지합니다.';
            RETURN OLD;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. 테이블에 트리거 적용 (데이터를 넣기 전에 검사)
DROP TRIGGER IF EXISTS tr_protect_investor_data ON public.stock_data_cache;
CREATE TRIGGER tr_protect_investor_data
BEFORE UPDATE OR INSERT ON public.stock_data_cache
FOR EACH ROW
EXECUTE FUNCTION protect_empty_investor_data();
