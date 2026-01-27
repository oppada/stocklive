// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.replace('/api/uapi', '/uapi') || '';
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // GET/DELETE 요청 시에는 body를 아예 포함하지 않도록 설정
  const fetchOptions: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'authorization': req.headers.authorization as string || '',
      'appkey': req.headers.appkey as string || '',
      'appsecret': req.headers.appsecret as string || '',
      'tr_id': req.headers.tr_id as string || '',
      'custtype': 'P',
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Proxy Error', details: error });
  }
}