// api/uapi/[...path].ts

export const config = {
  runtime: 'edge', // Vercel Edge Runtime을 사용하여 별도의 타입 설치 없이 실행
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    // /api/uapi/ 뒤의 경로를 추출
    const path = url.pathname.replace('/api/uapi/', '');
    const searchParams = url.search;

    // 한국투자증권 API 서버 주소
    const targetUrl = `https://openapi.koreainvestment.com:9443/uapi/${path}${searchParams}`;

    // 브라우저에서 보낸 헤더 복사
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=UTF-8');
    headers.set('appkey', req.headers.get('appkey') || '');
    headers.set('appsecret', req.headers.get('appsecret') || '');
    headers.set('authorization', req.headers.get('authorization') || '');
    headers.set('tr_id', req.headers.get('tr_id') || '');
    headers.set('custtype', 'P');

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Proxy Error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
