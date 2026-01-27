// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // 절대 .get() 함수를 쓰지 않고 객체 속성으로만 접근
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
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    // 에러 발생 시 로그에 이 문구가 찍혀야 정상 반영된 것입니다.
    console.error('FINAL_PROXY_ERROR:', error.message);
    return res.status(500).json({ error: 'Proxy Error', message: error.message });
  }
}