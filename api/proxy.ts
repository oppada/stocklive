// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. URL 추출 (Vercel 환경 대응)
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // 2. 헤더 추출 (req.headers['key'] 방식 사용)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'authorization': (req.headers['authorization'] as string) || '',
    'appkey': (req.headers['appkey'] as string) || '',
    'appsecret': (req.headers['appsecret'] as string) || '',
    'tr_id': (req.headers['tr_id'] as string) || '',
    'custtype': 'P',
  };

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    // POST/PUT 등 바디가 필요한 요청 처리
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Vercel은 이미 바디를 파싱해서 req.body에 담아둡니다.
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    // 3. 응답 반환
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy Server Error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: error.message,
      url: targetUrl 
    });
  }
}