## 📝 2026년 2월 9일 업데이트: 홈페이지 성능 최적화 및 테마/종목 정보 표시 리팩토링

오늘은 StockLive 홈페이지의 심각한 성능 문제와 관련된 대규모 리팩토링 및 디버깅 작업을 수행했습니다. 목표는 과도한 API 호출과 클라이언트 측 과부하를 해결하여, 사용자에게 빠르고 안정적인 실시간 주식 정보를 제공하는 것이었습니다.

### 1. 문제 진단 및 아키텍처 변경

**초기 문제점:**
- **과도한 KIS API 호출**: 프론트엔드(`App.tsx`)에서 1000개가 넘는 모든 주식의 가격을 개별적으로 KIS API에 요청하여 네트워크 부하가 극심했습니다.
- **클라이언트 측 과부하**: `Home.tsx`에서 모든 테마의 평균 등락률을 계산하고 정렬하는 등, 브라우저에서 너무 많은 연산을 수행하여 성능 저하 및 앱 크래시를 유발했습니다.

**해결을 위한 아키텍처 변경:**
- **백엔드 중심 데이터 처리**: 모든 KIS API 호출과 복잡한 데이터 처리(등락률 계산, 정렬)를 Node.js 기반의 백엔드 서버로 이관하기로 결정했습니다.
- **프론트엔드의 단순화**: 프론트엔드는 이제 백엔드로부터 미리 가공된 데이터를 받아 화면에 표시하는 역할만 수행합니다.

### 2. 구현 및 디버깅 과정

**2.1. 백엔드 개발 (`stocklive/server`)**

-   **핵심 KIS API 연동**:
    -   `getKisToken` 함수를 구현하여 KIS API 인증 토큰을 발급받고 캐싱합니다.
    -   `fetchStockPrice` 함수를 구현하여 개별 주식의 가격 정보를 조회하고 캐싱합니다. 이 함수는 네트워크 오류(예: `socket hang up`)에 대비해 **재시도 메커니즘**과 **타임아웃(5초)**을 포함합니다.
    -   **Critical Fix**: `fetchStockPrice`에서 KIS API의 요구사항에 맞게 `tr_id`를 `FHKST01010100`으로 변경하고, 누락되었던 `Content-Type: application/json; charset=utf-8` 및 `custtype: 'P'` 헤더를 추가하여 KIS API가 주식 가격 요청을 거부하는 문제를 해결했습니다.
    -   **디버깅 강화**: `fetchStockPrice`에서 KIS API 응답 및 오류를 더 상세하게 로깅하도록 개선했습니다.
-   **새로운 API 엔드포인트 구현**:
    -   **`/api/themes/top-performing`**: 모든 테마의 주식 가격을 KIS API에서 가져와 테마별 평균 등락률을 계산하고, 상위 테마 목록을 정렬하여 반환합니다. KIS API 부하를 줄이기 위해 **10개씩 청크 단위로 병렬 요청**하고 청크 사이에 **500ms 지연**을 줍니다.
    -   **`/api/themes/:themeName/stocks`**: 특정 테마에 속한 종목 목록을 조회하여 실시간 가격 정보와 함께 정렬하여 반환합니다.
    -   **`/api/stocks/prices`**: 여러 종목 코드를 받아 해당 종목들의 가격 정보를 한 번에 반환하여 헤더 마퀴 및 관심 종목 목록에 사용됩니다.
-   **데이터 파싱 및 매핑 오류 수정**:
    -   `toss_real_150_themes.json` 파일이 객체 내 `themes` 배열을 포함하고 있어 `JSON.parse` 후 `parsedData.themes`로 접근하도록 수정했습니다.
    -   **Critical Fix**: `/api/themes/:themeName/stocks` 엔드포인트에서 테마 이름을 찾을 때 `t.name` 대신 `t.theme_name`을 사용하도록 수정하여 404 오류를 해결했습니다.
    -   `fetchStockPrice`에서 `tradeVolume` 및 `tradeValue`가 `null`/`undefined`일 경우 기본값 `0`으로 설정하도록 개선했습니다.
    -   **종목명 문제 디버깅**: KIS API에서 가져오는 `output.hts_korp_isnm`이 프론트엔드에서 제대로 표시되지 않는 문제를 디버깅하기 위해, `fetchStockPrice`에서 `name` 속성을 `String(output.hts_korp_isnm || stockCode).trim()`으로 할당하도록 수정했습니다.
        -   이전 단계에서는 `name: "TEST_NAME"`을 하드코딩하여 `name` 필드가 성공적으로 프론트엔드에 전달될 수 있음을 확인했습니다.
        -   현재 `output.hts_korp_isnm`을 `String()`으로 명시적으로 변환하고 `trim()`한 후, `stockCode`를 대체 값으로 사용하는 방식으로 최종 수정했습니다.

**2.2. 프론트엔드 리팩토링 (`stocklive/client`)**

-   **`App.tsx`**:
    -   KIS API와 직접 통신하던 모든 기존 로직(토큰 발급, 개별 주식 가격 조회 루프)을 제거했습니다.
    -   새로 만든 백엔드 `/api/stocks/prices` 엔드포인트를 호출하여 마퀴 및 관심 종목에 필요한 주식 가격을 주기적으로 가져오도록 수정했습니다.
    -   사용되지 않는 `delay` 유틸리티 함수를 제거했습니다.
    -   **Critical Fix**: 마퀴의 등락률 색상(빨강/파랑) 및 퍼센트 표시를 `stock.changeRate`를 기반으로 직접 계산하도록 수정했습니다.
-   **`Home.tsx`**:
    -   클라이언트 측에서 테마 데이터를 처리(가져오기, 계산, 정렬)하던 모든 로직을 제거했습니다.
    -   새로운 백엔드 엔드포인트(`/api/themes/top-performing`, `/api/themes/:themeName/stocks`)를 호출하여 데이터를 가져오도록 수정했습니다.
    -   API 호출 실패 시 앱이 크래시되지 않도록 견고한 **오류 처리 로직**을 추가했습니다.
    -   리스트 렌더링 시 `key` prop에 고유한 `stock.code`를 사용하도록 수정했습니다.
    -   `stock.change` 대신 `stock.changeRate`를 사용하여 등락률을 정확히 표시하도록 수정했습니다.
    -   `stock.changeRate`가 `undefined`일 경우 `toFixed(2)` 호출 시 크래시되지 않도록 `|| 0` 대체값을 추가했습니다.
-   **`vite.config.ts`**:
    -   오래된 KIS API 프록시 설정을 제거하고, 모든 `/api` 요청을 `http://localhost:4000`에서 실행 중인 새로운 Node.js 백엔드 서버로 리다이렉션하도록 프록시 설정을 업데이트했습니다.

## 3. 남아있는 문제 및 향후 계획

현재 가장 시급한 문제는 **종목명이 숫자로 표시되는 현상**입니다. (예: "삼성전자" 대신 "005930"으로 표시)
-   최근 적용된 수정 사항(`name: (typeof output.hts_korp_isnm === 'string' ? output.hts_korp_isnm : stockCode).trim()`)이 이 문제를 해결할 것으로 기대합니다.

**향후 계획:**

1.  **종목명 문제 최종 확인**: 현재 적용된 수정 사항이 종목명을 올바르게 표시하는지 확인합니다.
2.  **나머지 카테고리 구현**: 티커 및 테마를 제외한 `급상승`, `급하락`, `거래량`, `거래대금` 등의 시장 순위 카테고리에 실제 데이터를 연결하는 작업을 진행합니다. 이를 위해 백엔드에 새로운 API 엔드포인트를 구현하고 프론트엔드를 업데이트할 예정입니다.
3.  **Vercel 배포 확인**: 모든 로컬 작업이 완료되면 Vercel 배포 환경에서도 문제가 없는지 확인합니다.
`## 📝 2026년 2월 8일 업데이트: NPM 취약점 해결, 로컬 개발 환경 구성 및 Recharts 경고 해결

오늘은 NPM 의존성 취약점, 로컬 개발 환경 설정 문제, Vercel 배포 오류, 그리고 Recharts 라이브러리 경고 해결에 집중했습니다.

### 1. NPM 취약점 및 의존성 문제 해결
*   **문제:** 반복적인 `npm audit fix --force` 실행에도 불구하고 NPM 의존성 취약점 해결이 되지 않고, `@vercel/node` 버전이 계속 변경되는 "의존성 지옥" 현상이 발생했습니다. 이는 `npm audit`이 부정확한 패치 버전을 제시하고, `package.json`의 `type: module` 설정과 `__dirname` 사용 방식이 충돌하며, `^`를 포함한 버전 오버라이드 때문에 `ETARGET` 오류가 발생했기 때문입니다.
*   **해결:**
    *   `client/package.json` 파일에서 `@vercel/node` 의존성을 안정적인 버전인 `^5.5.28`로 되돌려 안정성을 확보했습니다.
    *   `client/package.json`의 `overrides` 섹션에 `esbuild@0.25.0`, `undici@6.23.0`, `path-to-regexp@8.3.0`, `tar@7.5.7` 등 문제가 된 트랜지티브 의존성들의 정확하고 패치된 버전을 명시적으로 추가했습니다.
    *   `overrides` 버전에서 `^` 기호를 제거하여 `ETARGET` 오류를 방지했습니다.
    *   **결과:** 모든 `npm audit` 취약점이 성공적으로 해결되었습니다.

### 2. 로컬 개발 환경 KIS API 환경 변수 로딩 및 Vercel 배포 문제 해결
*   **문제:** 로컬 개발 환경에서 앱 실행 시 화면이 하얗게 뜨고 `localTokenServer.js`에서 `KIS_APP_KEY: Not Set` 오류가 발생했습니다. 또한, Vercel 배포 시 `tsc: command not found` 오류로 빌드가 실패했습니다.
*   **분석:**
    *   로컬 환경 문제는 `client/server/localTokenServer.js` 파일이 ES 모듈로 처리되면서 `__dirname`이 정의되지 않아 `.env.local` 파일을 올바르게 로드하지 못했기 때문입니다.
    *   Vercel 배포 오류는 `typescript`가 `devDependencies`에 포함되어 빌드 시 `tsc`를 찾지 못했기 때문입니다.
*   **해결:**
    *   `client/server/localTokenServer.js` 파일에 `import.meta.url`을 사용하여 `__filename`과 `__dirname`을 ES 모듈 환경에서 올바르게 정의하는 코드를 추가했습니다.
    *   `dotenv.config` 호출 경로를 `path.resolve(__dirname, '..', '.env.local')`로 수정하여 `.env.local` 파일을 스크립트 위치 기준으로 정확하게 로드하도록 했습니다.
    *   Vercel 배포 설정에서 빌드 명령을 `npm install && npm run build`로 재정의하여 `devDependencies`를 포함한 모든 의존성이 설치되도록 했습니다.
    *   **결과:** 로컬 개발 서버에서 KIS 환경 변수가 성공적으로 로드되고 앱이 정상적으로 실행되었으며, Vercel 배포도 성공했습니다.

### 3. Recharts 차트 경고 및 레이아웃 조정
*   **문제:** `client/src/pages/Home.tsx` 파일의 차트 컴포넌트에서 `recharts` 경고(`The width(-1) and height(-1) of chart should be greater than 0`)가 지속적으로 발생했습니다. 이 경고를 해결하려는 초기 시도(고정 높이 `h-12` 또는 `style={{height: '24px'}}` 적용)는 차트의 크기를 변경하여 종목 리스트 행의 높이를 늘리는 부작용을 초래했습니다.
*   **분석:** `ResponsiveContainer`가 CSS Grid 레이아웃 내에서 부모 컨테이너로부터 유효한 치수(너비/높이)를 얻지 못하고 있었으며, 백분율 기반이나 `aspect` 비율을 사용하는 방식으로는 이 문제가 해결되지 않았습니다.
*   **해결:** `client/src/pages/Home.tsx` 파일에서 `ResponsiveContainer` 컴포넌트에 `width={108}` 및 `height={36}`과 같이 명시적인 픽셀 값을 지정했습니다. 이는 차트가 배치되는 그리드 컬럼의 너비(120px)를 고려하여 설정되었으며, 차트가 음수 치수를 보고하는 문제를 해결합니다.
*   **결과:** `recharts` 경고가 사라졌으며, 차트가 이전보다 약간 커졌지만 전반적인 레이아웃을 크게 해치지 않는 선에서 허용 가능한 수준이 되었습니다.

---
## 📝 2026년 1월 27일 업데이트: Git 충돌 해결 및 배포 오류 디버깅, KIS 토큰 캐싱 구현

오늘은 `git push` 과정에서 발생한 `non-fast-forward` 오류와 이어지는 배포 문제들을 해결하는 데 집중했습니다.

### 1. Git 병합 충돌 해결
*   **문제:** 원격 저장소와의 불일치로 인해 `git push`가 거부되었고, `git pull` 시 `client/package.json`, `client/src/App.tsx`, `client/vite.config.ts` 파일에서 병합 충돌이 발생했습니다.
*   **해결:** 수동으로 충돌 마커(<<<<<<< HEAD, =======, >>>>>>> branch_name)를 제거하고 코드를 통합하여 병합 충돌을 해결했습니다.

### 2. Vercel 배포 오류 디버깅 및 코드 수정
여러 배포 오류가 순차적으로 발생했으며, 각 문제에 대한 디버깅과 코드 수정이 이루어졌습니다.

*   **`client/vite.config.ts` 구문 오류 수정:**
    *   **문제:** 배포 과정에서 `vite.config.ts` 파일에 불필요한 중괄호(`}`)로 인한 `SyntaxError: Expected ")" but found "}"`가 발생했습니다.
    *   **해결:** `vite.config.ts` 파일 내의 객체 구조를 정확하게 수정하여 구문 오류를 해결했습니다.

*   **`req.headers.get is not a function` 오류 수정 (Vercel 환경):**
    *   **문제:** Vercel 환경에서 `client/api/uapi/[...path].ts` 파일 내 `req.headers.get()` 호출 시 `req.headers.get is not a function` 오류가 발생했습니다. Vercel의 서버리스 함수는 `req.headers`를 표준 `Headers` 객체가 아닌 일반 JavaScript 객체로 제공하기 때문이었습니다.
    *   **해결:** `req.headers` 객체에 대괄호 표기법(`req.headers['header-name']`)을 사용하여 헤더 값에 접근하도록 `client/api/uapi/[...path].ts` 파일을 수정했습니다. 또한, 타입스크립트 호환성을 위해 `as Record<string, string>` 타입 단언을 추가했습니다.

*   **Vercel KV 제거로 인한 `SyntaxError: Illegal return statement`:**
    *   **문제:** 사용자 요청에 따라 Vercel KV 캐싱 로직(`@vercel/kv` 의존성)을 코드에서 제거하는 과정에서 `client/api/uapi/[...path].ts` 파일의 JSON 파싱(`data = await response.json()`)을 감싸는 `try...catch` 블록이 손상되어 `Illegal return statement` 오류가 발생했습니다.
    *   **해결:** `try { data = await response.json(); } catch (...)` 구조를 올바르게 복원하여 구문 오류를 해결했습니다.

### 3. KIS API 토큰 발급 속도 제한 문제 해결 (인메모리 캐싱)
*   **문제:** 위 오류들을 해결한 후 배포 시 KIS API (`openapi.koreainvestment.com`)로부터 "접근토큰 발급 잠시 후 다시 시도하세요(1분당 1회)"라는 `403 Forbidden` (`EGW00133`) 응답이 발생하여 토큰 발급 속도 제한에 걸리는 문제가 확인되었습니다. 이전 Vercel KV 캐싱 로직이 제거되었기 때문에 발생한 문제였습니다.
*   **해결:** Vercel KV를 사용하지 않는 대안으로 `client/api/uapi/[...path].ts` 파일 내에 KIS 토큰과 그 만료 시간을 저장하는 **인메모리 캐싱 메커니즘**을 구현했습니다. 이는 전역 변수를 사용하여 서버리스 함수 인스턴스의 생애 주기 동안 토큰을 재활용함으로써 KIS API에 대한 반복적인 토큰 발급 요청을 줄여 속도 제한 문제를 완화합니다.

---
## ⚠️ 2026년 1월 27일 업데이트: 실시간 주가 티커 오류 해결 시도 및 현재 상황
이번 문제는 단순히 코드 한 줄의 실수가 아니라, 프론트엔드 빌드 도구(Vite)와 백언드 API 서버 사이의 통신 규칙이 어긋나서 발생한 복합적인 문제였습니다. 이해하기 쉽게 핵심만 요약해 드릴게요.

1. 문제의 원인 (Why?)
가장 큰 원인은 **"길 찾기 실패"**였습니다.

프록시(Proxy) 미작동: App.tsx에서 /uapi/...로 요청을 보냈지만, vite.config.ts 설정은 /api/uapi라는 신호가 올 때만 도와주기로 약속되어 있었습니다.

엉뚱한 응답 (HTML vs JSON): 요청을 어디로 보낼지 몰랐던 브라우저는 결국 자기 자신(index.html)을 가져왔습니다. 코드는 "주식 가격(JSON)"을 기다리고 있는데 "웹사이트 본문(HTML)"이 들어오니 < 문자를 보고 에러(Unexpected token <)를 뱉은 것이죠.

설정 파일 충돌: vite.config.js와 ts가 공존하면서 Vite가 어떤 규칙을 따라야 할지 혼란을 겪고 있었습니다.

2. 해결 방법 (How?)
우리는 세 단계를 통해 이 꼬인 매듭을 풀었습니다.

통신 경로 일원화:

App.tsx의 모든 요청 주소 앞에 /api를 붙여서 Vite가 **"아, 이건 증권사로 전달해줘야 하는 거구나!"**라고 확실히 인지하게 만들었습니다.

설정 파일 정제:

중복되던 .js 파일을 지우고 .ts 파일로 통합했습니다.

package.json에서 명령어를 수정해 Vite가 올바른 설정 파일을 읽도록 강제했습니다.

캐시 리셋 (--force):

브라우저와 서버가 기억하고 있던 "잘못된 길(구 버전 캐시)"을 강제로 삭제하고 새 길을 찾게 했습니다.
`## 📝 2026년 2월 9일 업데이트: 홈페이지 성능 최적화 및 테마/종목 정보 표시 리팩토링

오늘은 StockLive 홈페이지의 심각한 성능 문제와 관련된 대규모 리팩토링 및 디버깅 작업을 수행했습니다. 목표는 과도한 API 호출과 클라이언트 측 과부하를 해결하여, 사용자에게 빠르고 안정적인 실시간 주식 정보를 제공하는 것이었습니다.

### 1. 문제 진단 및 아키텍처 변경

**초기 문제점:**
- **과도한 KIS API 호출**: 프론트엔드(`App.tsx`)에서 1000개가 넘는 모든 주식의 가격을 개별적으로 KIS API에 요청하여 네트워크 부하가 극심했습니다.
- **클라이언트 측 과부하**: `Home.tsx`에서 모든 테마의 평균 등락률을 계산하고 정렬하는 등, 브라우저에서 너무 많은 연산을 수행하여 성능 저하 및 앱 크래시를 유발했습니다.

**해결을 위한 아키텍처 변경:**
- **백엔드 중심 데이터 처리**: 모든 KIS API 호출과 복잡한 데이터 처리(등락률 계산, 정렬)를 Node.js 기반의 백엔드 서버로 이관하기로 결정했습니다.
- **프론트엔드의 단순화**: 프론트엔드는 이제 백엔드로부터 미리 가공된 데이터를 받아 화면에 표시하는 역할만 수행합니다.

### 2. 구현 및 디버깅 과정

**2.1. 백엔드 개발 (`stocklive/server`)**

-   **핵심 KIS API 연동**:
    -   `getKisToken` 함수를 구현하여 KIS API 인증 토큰을 발급받고 캐싱합니다.
    -   `fetchStockPrice` 함수를 구현하여 개별 주식의 가격 정보를 조회하고 캐싱합니다. 이 함수는 네트워크 오류(예: `socket hang up`)에 대비해 **재시도 메커니즘**과 **타임아웃(5초)**을 포함합니다.
    -   **Critical Fix**: `fetchStockPrice`에서 KIS API의 요구사항에 맞게 `tr_id`를 `FHKST01010100`으로 변경하고, 누락되었던 `Content-Type: application/json; charset=utf-8` 및 `custtype: 'P'` 헤더를 추가하여 KIS API가 주식 가격 요청을 거부하는 문제를 해결했습니다.
    -   **디버깅 강화**: `fetchStockPrice`에서 KIS API 응답 및 오류를 더 상세하게 로깅하도록 개선했습니다.
-   **새로운 API 엔드포인트 구현**:
    -   **`/api/themes/top-performing`**: 모든 테마의 주식 가격을 KIS API에서 가져와 테마별 평균 등락률을 계산하고, 상위 테마 목록을 정렬하여 반환합니다. KIS API 부하를 줄이기 위해 **10개씩 청크 단위로 병렬 요청**하고 청크 사이에 **500ms 지연**을 줍니다.
    -   **`/api/themes/:themeName/stocks`**: 특정 테마에 속한 종목 목록을 조회하여 실시간 가격 정보와 함께 정렬하여 반환합니다.
    -   **`/api/stocks/prices`**: 여러 종목 코드를 받아 해당 종목들의 가격 정보를 한 번에 반환하여 헤더 마퀴 및 관심 종목 목록에 사용됩니다.
-   **데이터 파싱 및 매핑 오류 수정**:
    -   `toss_real_150_themes.json` 파일이 객체 내 `themes` 배열을 포함하고 있어 `JSON.parse` 후 `parsedData.themes`로 접근하도록 수정했습니다.
    -   **Critical Fix**: `/api/themes/:themeName/stocks` 엔드포인트에서 테마 이름을 찾을 때 `t.name` 대신 `t.theme_name`을 사용하도록 수정하여 404 오류를 해결했습니다.
    -   `fetchStockPrice`에서 `tradeVolume` 및 `tradeValue`가 `null`/`undefined`일 경우 기본값 `0`으로 설정하도록 개선했습니다.
    -   **종목명 문제 디버깅**: KIS API에서 가져오는 `output.hts_korp_isnm`이 프론트엔드에서 제대로 표시되지 않는 문제를 디버깅하기 위해, `fetchStockPrice`에서 `name` 속성을 `String(output.hts_korp_isnm || stockCode).trim()`으로 할당하도록 수정했습니다.
        -   이전 단계에서는 `name: "TEST_NAME"`을 하드코딩하여 `name` 필드가 성공적으로 프론트엔드에 전달될 수 있음을 확인했습니다.
        -   현재 `output.hts_korp_isnm`을 `String()`으로 명시적으로 변환하고 `trim()`한 후, `stockCode`를 대체 값으로 사용하는 방식으로 최종 수정했습니다.

**2.2. 프론트엔드 리팩토링 (`stocklive/client`)**

-   **`App.tsx`**:
    -   KIS API와 직접 통신하던 모든 기존 로직(토큰 발급, 개별 주식 가격 조회 루프)을 제거했습니다.
    -   새로 만든 백엔드 `/api/stocks/prices` 엔드포인트를 호출하여 마퀴 및 관심 종목에 필요한 주식 가격을 주기적으로 가져오도록 수정했습니다.
    -   사용되지 않는 `delay` 유틸리티 함수를 제거했습니다.
    -   **Critical Fix**: 마퀴의 등락률 색상(빨강/파랑) 및 퍼센트 표시를 `stock.changeRate`를 기반으로 직접 계산하도록 수정했습니다.
-   **`Home.tsx`**:
    -   클라이언트 측에서 테마 데이터를 처리(가져오기, 계산, 정렬)하던 모든 로직을 제거했습니다.
    -   새로운 백엔드 엔드포인트(`/api/themes/top-performing`, `/api/themes/:themeName/stocks`)를 호출하여 데이터를 가져오도록 수정했습니다.
    -   API 호출 실패 시 앱이 크래시되지 않도록 견고한 **오류 처리 로직**을 추가했습니다.
    -   리스트 렌더링 시 `key` prop에 고유한 `stock.code`를 사용하도록 수정했습니다.
    -   `stock.change` 대신 `stock.changeRate`를 사용하여 등락률을 정확히 표시하도록 수정했습니다.
    -   `stock.changeRate`가 `undefined`일 경우 `toFixed(2)` 호출 시 크래시되지 않도록 `|| 0` 대체값을 추가했습니다.
-   **`vite.config.ts`**:
    -   오래된 KIS API 프록시 설정을 제거하고, 모든 `/api` 요청을 `http://localhost:4000`에서 실행 중인 새로운 Node.js 백엔드 서버로 리다이렉션하도록 프록시 설정을 업데이트했습니다.

## 3. 남아있는 문제 및 향후 계획

현재 가장 시급한 문제는 **종목명이 숫자로 표시되는 현상**입니다. (예: "삼성전자" 대신 "005930"으로 표시)
-   최근 적용된 수정 사항(`name: (typeof output.hts_korp_isnm === 'string' ? output.hts_korp_isnm : stockCode).trim()`)이 이 문제를 해결할 것으로 기대합니다.

**향후 계획:**

1.  **종목명 문제 최종 확인**: 현재 적용된 수정 사항이 종목명을 올바르게 표시하는지 확인합니다.
2.  **나머지 카테고리 구현**: 티커 및 테마를 제외한 `급상승`, `급하락`, `거래량`, `거래대금` 등의 시장 순위 카테고리에 실제 데이터를 연결하는 작업을 진행합니다. 이를 위해 백엔드에 새로운 API 엔드포인트를 구현하고 프론트엔드를 업데이트할 예정입니다.
3.  **Vercel 배포 확인**: 모든 로컬 작업이 완료되면 Vercel 배포 환경에서도 문제가 없는지 확인합니다.