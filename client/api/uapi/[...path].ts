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

    let targetUrl = `https://openapi.koreainvestment.com:9443/uapi/${path}${searchParams}`;
    let requestHeaders = new Headers();
    let requestBody: string | undefined;
    let requestMethod = req.method;

    if (path === 'oauth2/tokenP') {
      // Special handling for KIS token issuance
      requestMethod = 'POST'; // Token issuance is typically POST

      // For token issuance, KIS API expects appkey and appsecret in the body
      // We assume the client sends appkey and appsecret as headers,
      // and we convert them to the body for the KIS API.
      const clientAppKey = req.headers.get('appkey');
      const clientAppSecret = req.headers.get('appsecret');

      if (!clientAppKey || !clientAppSecret) {
        return new Response(JSON.stringify({ 
          error: 'Proxy Error', 
          message: 'appkey or appsecret missing for token issuance',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      requestBody = JSON.stringify({
        'grant_type': 'client_credentials',
        'appkey': clientAppKey,
        'appsecret': clientAppSecret
      });
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      // No other headers like tr_id, custtype, authorization for token issuance
      // So, for tokenP, we only send Content-Type in headers.
    } else {
      // General handling for other KIS API calls
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      requestHeaders.set('appkey', req.headers.get('appkey') || '');
      requestHeaders.set('appsecret', req.headers.get('appsecret') || '');
      requestHeaders.set('authorization', req.headers.get('authorization') || '');
      requestHeaders.set('tr_id', req.headers.get('tr_id') || '');
      requestHeaders.set('custtype', 'P');
      requestBody = req.method !== 'GET' ? await req.text() : undefined;
    }

    const response = await fetch(targetUrl, {
      method: requestMethod,
      headers: requestHeaders,
      body: requestBody,
    });

    // Check if the response from KIS API was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`KIS API responded with status ${response.status} for ${targetUrl}: ${errorText}`);
      return new Response(JSON.stringify({
        error: 'KIS API Error',
        message: `KIS API responded with status ${response.status}`,
        details: errorText,
        targetUrl: targetUrl
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
      console.error(`Failed to parse KIS API response as JSON for ${targetUrl}. Raw response: ${rawResponseText}. Error: ${jsonError.message}`);
      return new Response(JSON.stringify({
        error: 'Proxy Error',
        message: 'Failed to parse KIS API response as JSON',
        details: rawResponseText,
        originalError: jsonError.message,
        targetUrl: targetUrl
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
