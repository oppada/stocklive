// /api/get-token.js
// Vercel Serverless Function to fetch KIS API token securely.

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    response.setHeader('Allow', ['POST']);
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get API keys from server-side environment variables
  const KIS_APP_KEY = process.env.VITE_KIS_APP_KEY;
  const KIS_APP_SECRET = process.env.VITE_KIS_APP_SECRET;

  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    return response.status(500).json({ error: 'API keys are not configured on the server.' });
  }

  try {
    const apiResponse = await fetch('https://openapi.koreainvestment.com:9443/uapi/oauth2/tokenP', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
      }),
    });

    const data = await apiResponse.json();

    // Log the KIS API response for debugging
    console.error('KIS API Response Status:', apiResponse.status);
    console.error('KIS API Response Status Text:', apiResponse.statusText);
    console.error('KIS API Response Data:', data);


    // Forward the status and response from the KIS API
    response.status(apiResponse.status).json(data);

  } catch (error) {
    console.error('KIS Token API Error:', error);
    response.status(500).json({ error: 'Internal Server Error while fetching from KIS API.' });
  }
}
