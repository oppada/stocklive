-- [데이터 증발 및 중복 방지] Supabase 주식 데이터 캐시 구조 교정 스크립트

-- 1. 기존 중복 데이터 정리 (가장 최신 업데이트만 남기고 삭제)
DELETE FROM public.stock_data_cache a
USING public.stock_data_cache b
WHERE a.ctid < b.ctid 
  AND a.id = b.id;

-- 2. id 컬럼을 Primary Key로 설정 (중복 방지 핵심)
-- 만약 이미 PK가 있다면 에러가 날 수 있으니, 무시하거나 기존 PK를 삭제 후 재설정합니다.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='stock_data_cache' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.stock_data_cache ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 3. RLS(행 수준 보안) 설정 및 삭제 방지 정책
ALTER TABLE public.stock_data_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Protect toss_investor_trend_all from delete" ON public.stock_data_cache;
CREATE POLICY "Protect toss_investor_trend_all from delete" 
ON public.stock_data_cache 
FOR DELETE 
USING (id != 'toss_investor_trend_all');

DROP POLICY IF EXISTS "Enable all access" ON public.stock_data_cache;
CREATE POLICY "Enable all access" ON public.stock_data_cache
FOR ALL USING (true) WITH CHECK (true);


-- 4. 빈 데이터(Null/Empty) 업데이트 방지 트리거
CREATE OR REPLACE FUNCTION protect_investor_data_logic()
RETURNS TRIGGER AS $$
DECLARE
    row_count INTEGER;
BEGIN
    -- 특정 행(toss_investor_trend_all)에 대해서만 작동
    IF (NEW.id = 'toss_investor_trend_all') THEN
        -- 빈 데이터거나 구조가 깨진 경우 업데이트 거부
        IF (NEW.data IS NULL OR NEW.data::text = '{}'::text) THEN
            RETURN OLD;
        END IF;

        -- 내부 리스트가 비어있는지 정밀 체크
        BEGIN
            row_count := jsonb_array_length(NEW.data->'buy'->'foreign'->'list');
            IF (row_count IS NULL OR row_count < 10) THEN
                RETURN OLD; -- 기존 데이터 유지
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN OLD; -- 에러 시 기존 데이터 유지
        END;
    END IF;
    
    RETURN NEW; -- 정상 데이터는 업데이트 허용
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_investor_data ON public.stock_data_cache;
CREATE TRIGGER tr_protect_investor_data
BEFORE UPDATE OR INSERT ON public.stock_data_cache
FOR EACH ROW
EXECUTE FUNCTION protect_investor_data_logic();
