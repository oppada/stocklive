import type { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { path = [] } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const queryString = req.url?.split('?')[1];

    const url = `https://openapi.koreainvestment.com:9443/uapi/${apiPath}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'appkey': req.headers['appkey'] as string || '',
        'appsecret': req.headers['appsecret'] as string || '',
        'authorization': req.headers['authorization'] as string || '',
        'tr_id': req.headers['tr_id'] as string || '',
        'custtype': 'P',
        'host': 'openapi.koreainvestment.com',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e: any) {
    res.status(500).json({ error: 'Proxy Error', message: e.message });
  }
}