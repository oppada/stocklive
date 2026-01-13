<<<<<<< HEAD
import type { VercelRequest, VercelResponse } from 'vercel';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { path = [] } = req.query;
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const queryString = req.url?.split('?')[1];

    const url = `https://openapi.koreainvestment.com:9443/uapi/${apiPath}${queryString ? `?${queryString}` : ''}`;
=======
export default async function handler(req: any, res: any) {
  try {
    const { path = [] } = req.query
    const queryString = req.url?.split('?')[1]

    const apiPath = Array.isArray(path) ? path.join('/') : path

    const url =
      `https://openapi.koreainvestment.com:9443/uapi/${apiPath}` +
      (queryString ? `?${queryString}` : '')
>>>>>>> aa456f0394d5af997eef0d30166732e4a2abe931

    const response = await fetch(url, {
      method: req.method,
      headers: {
<<<<<<< HEAD
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
=======
        ...req.headers,
        host: 'openapi.koreainvestment.com',
      },
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : JSON.stringify(req.body),
    })

    const text = await response.text()
    res.status(response.status).send(text)
  } catch (e) {
    console.error('❌ KIS Proxy Error', e)
    res.status(500).json({ error: 'KIS Proxy Failed' })
  }
}
>>>>>>> aa456f0394d5af997eef0d30166732e4a2abe931
