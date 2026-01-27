// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. URL 추출 및 대상 주소 설정
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // 2. 헤더 추출 (중요: .get() 대신 대괄호 접근법 사용)
  // Node.js의 req.headers는 소문자로 자동 변환되므로 소문자로 접근합니다.
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

    // GET/HEAD가 아닌 요청(POST 등)에만 바디를 포함
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Vercel 환경에서는 req.body가 이미 파싱된 객체일 수 있으므로 다시 문자열화합니다.
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    // 3. 실제 증권사 서버로 요청 전송
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    // 결과를 클라이언트로 반환
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy Server Error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: error.message,
      targetUrl: targetUrl 
    });
  }
}