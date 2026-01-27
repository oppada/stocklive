## ⚠️ 2026년 1월 27일 업데이트: 실시간 주가 티커 오류 해결 시도 및 현재 상황

**문제:** 홈 화면 티커에 현재가가 표시되지 않고 "조회중..."으로 나타나는 현상 지속. 콘솔 로그에 404 오류 및 KIS API 서버로부터 HTML 오류 페이지 응답 확인.

**원인 분석:**
1.  **초기 404 오류 (KIS 토큰 발급 실패):**
    *   **원인:** `vite.config.js` 파일 누락 및 `package.json`의 `dev` 스크립트가 `vite.config.js`를 명시적으로 로드하지 않음. 또한, `App.tsx`의 API 요청 경로에 불필요한 `/api` 접두사가 포함되어 프록시 라우팅에 실패.
    *   **해결:**
        *   `README.md`에 명시된 내용 기반으로 `C:\Users\user\stocklive\client\vite.config.js` 파일 생성.
        *   `package.json`의 `dev` 스크립트를 `"dev": "vite --config vite.config.js --force"`로 수정하여 `vite.config.js`를 명시적으로 로드하도록 함.
        *   `vite.config.js` 프록시 설정에 `rewrite: (path) => path.replace(/^\/uapi/, '')` 규칙을 추가하여 `/uapi` 접두사가 제거된 후 요청이 대상 서버로 전달되도록 함.
        *   `App.tsx` 내 `fetch` 호출에서 `/api/uapi` 경로를 `/uapi`로 수정하여 프록시 규칙과 일치하도록 함.
    *   **결과:** KIS 토큰 발급은 성공적으로 이루어지기 시작함. 한국투자증권으로부터 토큰 발급 문자 메시지 수신 확인. (이슈 해결)

2.  **주가 조회 API 호출 시 HTML 오류 페이지 응답 (KIS 토큰 발급 성공 후):**
    *   **문제:** KIS 토큰 발급 성공 후, 주가 조회 API (`/uapi/domestic-stock/v1/quotations/inquire-price`) 호출 시 200 OK 응답을 받지만, 실제 응답 내용은 주가 데이터가 아닌 KIS 서버의 HTML 오류 페이지 (`securities.koreainvestment.com/error/error.jsp`)로 리디렉션됨.
    *   **시도한 조치:**
        *   `fetchStockPrice` 함수에 `Content-Type: application/json; charset=UTF-8` 헤더 추가 (KIS REST API의 일반적인 요구 사항 및 웹 검색 결과 기반).
        *   `fetchStockPrice` 함수 헤더에서 `appkey` 및 `appsecret` 제거/주석 처리 (토큰 발급 후 불필요하거나 충돌할 가능성 고려).
        *   `fetchStockPrice` 함수 내 `tr_id`를 `README.md`에 명시된 `"FHKST01010100"`에서 KIS OpenAPI 문서(OCR 결과)에서 "주식현재가 일자별"과 관련된 `"FHKST01010400"`으로 변경 시도.
        *   `tr_id`를 다시 `README.md`에 명시된 `"FHKST01010100"`으로 되돌림 (초기 `README.md`의 해결책 재적용).
        *   PDF 문서의 OCR 텍스트에서 `FID_COND_MRKT_DIV_CODE`, `FID_INPUT_ISCD` 등 쿼리 파라미터에 대한 상세 정보를 검색했으나, 명확한 사용 가이드라인을 찾지 못함.
    *   **현재 상황:** 모든 시도에도 불구하고 주가 조회 API는 여전히 HTML 오류 페이지를 반환함. 이는 KIS API 서버 측에서 요청을 거부하는 것으로 판단됨.

**결론 및 다음 단계:**
현재까지의 문제 해결 시도에도 불구하고 주가 조회 API가 정상적으로 작동하지 않는 것은, 코드 상의 일반적인 오류가 아닌 API 자체의 특정 요구사항(예: `tr_id`의 정확한 매핑, 특정 파라미터 값, 계정 권한 등)에 기인한 것으로 보입니다.

**다음 단계로 한국투자증권 OpenAPI 기술 지원팀에 직접 문의하여 해당 API (`/uapi/domestic-stock/v1/quotations/inquire-price`)의 정확한 호출 방법 (필수 헤더, 쿼리 파라미터, `tr_id` 등)과 발생하고 있는 HTML 오류 페이지 리디렉션 문제에 대한 지원을 요청해야 합니다.**

**제공해야 할 정보:**
*   사용 중인 API 엔드포인트: `/uapi/domestic-stock/v1/quotations/inquire-price`
*   현재 전송 중인 HTTP 헤더:
    *   `authorization: Bearer [발급된 KIS 토큰]`
    *   `tr_id: "FHKST01010100"` (또는 "FHKST01010400"도 시도했음을 언급)
    *   `custtype: "P"`
    *   `Content-Type: application/json; charset=UTF-8`
*   현재 전송 중인 쿼리 파라미터:
    *   `FID_COND_MRKT_DIV_CODE=J`
    *   `FID_INPUT_ISCD=[종목 코드]`
*   수신되는 응답 (HTML 오류 페이지): `<html><meta http-equiv="refresh" content="0; url=https://securities.koreainvestment.com/error/error.jsp"></meta><body></body></html>`
*   KIS 토큰은 정상적으로 발급되고 있음을 명시.

**참고:** `appkey`와 `appsecret`은 토큰 발급 API에만 사용하고 있으며, 주가 조회 API 호출 시에는 헤더에서 주석 처리했음을 언급할 수 있습니다.