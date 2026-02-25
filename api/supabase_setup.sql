-- [최종판] Supabase 주식 데이터 캐시 철벽 보호 스크립트

-- 1. RLS 활성화 및 기존 정책 초기화
ALTER TABLE public.stock_data_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Protect toss_investor_trend_all from delete" ON public.stock_data_cache;
DROP POLICY IF EXISTS "Enable all access" ON public.stock_data_cache;

-- [삭제 방지] 특정 행은 삭제 명령어 자체를 차단
CREATE POLICY "Protect toss_investor_trend_all from delete" 
ON public.stock_data_cache 
FOR DELETE 
USING (id != 'toss_investor_trend_all');

-- [전체 접근] 읽기/쓰기는 허용
CREATE POLICY "Enable all access" ON public.stock_data_cache
FOR ALL USING (true) WITH CHECK (true);


-- 2. 스마트 데이터 검증 트리거 함수
CREATE OR REPLACE FUNCTION protect_investor_data_logic()
RETURNS TRIGGER AS $$
DECLARE
    row_count INTEGER;
BEGIN
    -- 대상 행: toss_investor_trend_all
    IF (NEW.id = 'toss_investor_trend_all') THEN
        -- 1단계: 완전 빈 데이터 체크
        IF (NEW.data IS NULL OR NEW.data::text = '{}'::text) THEN
            RAISE NOTICE '❌ 빈 데이터 업데이트 시도 차단됨';
            RETURN OLD; 
        END IF;

        -- 2단계: 종목 리스트 존재 여부 및 개수 체크 (안전한 JSON 파싱)
        BEGIN
            row_count := jsonb_array_length(NEW.data->'buy'->'foreign'->'list');
            IF (row_count IS NULL OR row_count < 10) THEN
                RAISE NOTICE '⚠️ 부실한 데이터(종목수 부족) 업데이트 시도 차단됨';
                RETURN OLD; 
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '🔥 JSON 구조 오류로 인한 업데이트 차단됨';
            RETURN OLD; 
        END;
    END IF;
    
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;


-- 3. 트리거 활성화
DROP TRIGGER IF EXISTS tr_protect_investor_data ON public.stock_data_cache;
CREATE TRIGGER tr_protect_investor_data
BEFORE UPDATE OR INSERT ON public.stock_data_cache
FOR EACH ROW
EXECUTE FUNCTION protect_investor_data_logic();
