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

    // Check if the response from KIS API was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`KIS API responded with status ${response.status}: ${errorText}`);
      return new Response(JSON.stringify({ 
        error: 'KIS API Error', 
        message: `KIS API responded with status ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError: any) {
      const rawResponseText = await response.text();
      console.error(`Failed to parse KIS API response as JSON. Raw response: ${rawResponseText}. Error: ${jsonError.message}`);
      return new Response(JSON.stringify({ 
        error: 'Proxy Error', 
        message: 'Failed to parse KIS API response as JSON',
        details: rawResponseText,
        originalError: jsonError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error(`Unhandled Proxy Error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: 'Proxy Error', 
      message: 'An unexpected error occurred in the proxy function',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
