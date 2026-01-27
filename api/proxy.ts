// api/proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. URL 설정
  const url = req.url || '';
  const path = url.replace('/api/uapi', '/uapi');
  const targetUrl = `https://openapi.koreainvestment.com:9443${path}`;

  // 2. 헤더 처리 (절대 .get()을 쓰지 마세요)
  // Node.js의 req.headers는 소문자로 자동 변환된 일반 객체입니다.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'authorization': String(req.headers['authorization'] || ''),
    'appkey': String(req.headers['appkey'] || ''),
    'appsecret': String(req.headers['appsecret'] || ''),
    'tr_id': String(req.headers['tr_id'] || ''),
    'custtype': 'P',
  };

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    // GET이 아닐 때만 body 처리
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error: any) {
    // 에러 발생 시 로그에 상세 정보 남기기
    console.error('--- Proxy Error Detail ---');
    console.error('Target:', targetUrl);
    console.error('Message:', error.message);
    
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: error.message 
    });
  }
}