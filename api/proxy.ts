// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. 요청 경로에서 /api/uapi 부분 추출
  const path = req.url?.replace('/api/uapi', '/uapi') || '';
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'authorization': req.headers.authorization || '',
        'appkey': req.headers.appkey as string || '',
        'appsecret': req.headers.appsecret as string || '',
        'tr_id': req.headers.tr_id as string || '',
        'custtype': 'P',
      },
      // POST 요청일 경우 바디 전달
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy Error' });
  }
}