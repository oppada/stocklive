// /api/get-price.js
// Vercel Serverless Function to fetch stock prices from KIS API.

export default async function handler(request, response) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    response.setHeader('Allow', ['GET']);
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get parameters from the request
  const { stockCode } = request.query;
  const token = request.headers.authorization;

  // Get API keys from server-side environment variables
  const KIS_APP_KEY = process.env.VITE_KIS_APP_KEY;
  const KIS_APP_SECRET = process.env.VITE_KIS_APP_SECRET;

  if (!stockCode || !token) {
    return response.status(400).json({ error: 'Missing stockCode or authorization token.' });
  }

  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    return response.status(500).json({ error: 'API keys are not configured on the server.' });
  }

  const url = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`;

  try {
    const apiResponse = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': token,
        'appkey': KIS_APP_KEY,
        'appsecret': KIS_APP_SECRET,
        'tr_id': 'FHKST01010100',
        'custtype': 'P',
        'Accept': 'application/json'
      }
    });

    const data = await apiResponse.json();
    
    // Forward the status and response from the KIS API
    response.status(apiResponse.status).json(data);

  } catch (error) {
    console.error('KIS Price API Error:', error);
    response.status(500).json({ error: 'Internal Server Error while fetching from KIS API.' });
  }
}
