260112



🚀 프로젝트 정리: 한국투자증권 실시간 주가 티커 연동

1\. 개요

목적: Vite 환경에서 한국투자증권 OpenAPI를 호출하여 실시간 주가 데이터를 가져오고, 이를 웹 화면 상단 티커(Ticker)에 표시함



핵심 기술: React, Vite, 한국투자증권 OpenAPI, Proxy 설정



2\. 주요 해결 과제 및 조치 사항

❌ 이슈 1: API 호출 시 CORS 에러 및 404 Not Found

원인: 브라우저에서 외부 API(koreainvestment.com)를 직접 호출할 때 발생하는 보안 제약(CORS) 및 Vite 설정 파일 미인식



해결: vite.config.js를 생성하고 프록시(Proxy) 설정을 통해 로컬 요청(/uapi)을 증권사 서버로 우회시킴



❌ 이슈 2: Vite 설정 파일 인식 불가

현황: npm run dev 실행 시 설정 파일을 읽지 못해 프록시가 작동하지 않음



조치:



파일명을 vite.config.mjs에서 표준인 vite.config.js로 변경



package.json의 스크립트에 --config 옵션을 명시하여 강제 로드 실행



❌ 이슈 3: 500 에러 및 응답 코드 rt\_cd: 1 (조회 실패)

원인: 시세 조회 시 필수 헤더 값(tr\_id, custtype) 누락



해결: 호출 헤더에 tr\_id: "FHKST01010100" 및 custtype: "P"를 추가하여 정상 응답 수신 성공



3\. 최종 설정 코드

📄 vite.config.js (프록시 설정)

JavaScript



import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'



export default defineConfig({

&nbsp; plugins: \[react()],

&nbsp; server: {

&nbsp;   proxy: {

&nbsp;     '/uapi': {

&nbsp;       target: 'https://openapi.koreainvestment.com:9443',

&nbsp;       changeOrigin: true,

&nbsp;       secure: false

&nbsp;     }

&nbsp;   }

&nbsp; }

})

📄 package.json (실행 스크립트)

JSON



"scripts": {

&nbsp; "dev": "vite --config vite.config.js --force"

}

4\. 실행 및 확인 방법

서버 실행: 터미널에서 npm run dev 입력



로그 확인: 터미널 첫 줄에 Config file: .../vite.config.js 문구 확인



결과 확인: 브라우저 콘솔에 ✅ KIS 토큰 발급 성공! 메시지와 함께 실시간 주가 출력 확인



5\. 향후 유지보수 참고

토큰 관리: 현재 토큰은 로컬 스토리지에 캐싱되며 만료 2분 전 자동 갱신됨



종목 추가: App.tsx 내 tickerStocks 배열에 종목 코드만 추가하면 즉시 반영됨

