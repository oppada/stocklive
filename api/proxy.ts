import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'authorization': String(req.headers['authorization'] || ''),
    'appkey': String(req.headers['appkey'] || ''),
    'appsecret': String(req.headers['appsecret'] || ''),
    'tr_id': String(req.headers['tr_id'] || ''),
    'custtype': 'P',
  };

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      // 1. 요청이 너무 길어지면 브라우저가 아니라 프록시에서 먼저 끊어줘야 함
    });

    // 2. 응답이 JSON인지 확인하는 과정 추가
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      // JSON이 아닐 경우(에러 페이지 등) 텍스트로 읽어서 에러 처리
      const errorText = await response.text();
      console.error('KIS Non-JSON Response:', errorText);
      return res.status(500).json({ error: 'KIS_SERVER_ERROR', message: '증권사 응답이 올바르지 않습니다.' });
    }

  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return res.status(500).json({ error: 'Proxy Error', message: error.message });
  }
}