// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. URL 추출 및 대상 주소 설정
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // 2. 헤더 처리 (중요: .get() 대신 객체 접근 방식을 사용해야 함)
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

    // GET 이외의 요청(POST 등)일 때만 body를 포함시킴
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // req.body가 이미 객체라면 stringify하고, 문자열이라면 그대로 사용
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    // 증권사 서버의 응답을 그대로 클라이언트에 전달
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy Server Error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: error.message 
    });
  }
}