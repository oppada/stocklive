// api/uapi/[...path].ts



export default async function handler(req: Request) {
  // Read APPKEY and APPSECRET from environment variables
  const APPKEY = process.env.VITE_KIS_APP_KEY;
  const APPSECRET = process.env.VITE_KIS_APP_SECRET;

  console.log('APPKEY length:', APPKEY ? APPKEY.length : 'undefined');
  console.log('APPSECRET length:', APPSECRET ? APPSECRET.length : 'undefined');
  
  if (!APPKEY || !APPSECRET) {
    console.error('Environment variables VITE_KIS_APP_KEY or VITE_KIS_APP_SECRET are not set.');
    return new Response(JSON.stringify({ 
      error: 'Configuration Error', 
      message: 'Server-side VITE_KIS_APP_KEY or VITE_KIS_APP_SECRET environment variables are not set.',
      details: 'Please ensure VITE_KIS_APP_KEY and VITE_KIS_APP_SECRET are configured in your Vercel project environment variables.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    console.log('Raw req.url:', req.url); // Added for debugging
    let url;
    let clientPath: string; // Declare clientPath here
    let searchParams: string; // Declare searchParams here
    try {
    console.log('typeof req.headers:', typeof req.headers);
    console.log('req.headers:', req.headers);
    const headers = req.headers as Record<string, string>; // Type assertion to treat headers as a plain object
    url = new URL(req.url, (headers['x-forwarded-proto'] || 'http') + '://' + (headers['host'] || 'localhost'));
      // /api/uapi/ 뒤의 경로를 추출 (for client side)
      clientPath = url.pathname.replace('/api/uapi/', '');
      searchParams = url.search;
    } catch (urlError: any) {
      console.error(`Error parsing req.url: ${urlError.message}, Raw req.url: ${req.url}`);
      return new Response(JSON.stringify({ 
        error: 'URL Parsing Error', 
        message: 'Could not parse the request URL.',
        details: urlError.message,
        rawUrl: req.url
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    searchParams = url.search;

    let targetUrl;
    // Determine the correct target URL based on the clientPath
    if (clientPath === 'oauth2/tokenP') {
      // For token issuance, remove the '/uapi' prefix from the target URL
      targetUrl = `https://openapi.koreainvestment.com:9443/${clientPath}${searchParams}`;
    } else {
      // For other KIS API calls, keep the '/uapi' prefix
      targetUrl = `https://openapi.koreainvestment.com:9443/uapi/${clientPath}${searchParams}`;
    }

    let requestHeaders = new Headers();
    let requestBody: string | undefined;
    let requestMethod = req.method;

    if (clientPath === 'oauth2/tokenP') {


      // Special handling for KIS token issuance
      requestMethod = 'POST'; // Token issuance is typically POST

      // Use APPKEY and APPSECRET from environment variables
      requestBody = JSON.stringify({
        'grant_type': 'client_credentials',
        'appkey': APPKEY,
        'appsecret': APPSECRET
      });
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      // No other headers like tr_id, custtype, authorization for token issuance
      // So, for tokenP, we only send Content-Type in headers.
    } else {
      // General handling for other KIS API calls
      // Pass client-provided appkey/appsecret (if any) and other headers
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      requestHeaders.set('appkey', req.headers.get('appkey') || '');
      requestHeaders.set('appsecret', req.headers.get('appsecret') || '');
      requestHeaders.set('authorization', req.headers.get('authorization') || '');
      requestHeaders.set('tr_id', req.headers.get('tr_id') || '');
      requestHeaders.set('custtype', 'P');
      requestBody = req.method !== 'GET' ? await req.text() : undefined;
    }

    const response = await fetch(targetUrl, {
      method: requestMethod,
      headers: requestHeaders,
      body: requestBody,
    });

    // Check if the response from KIS API was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`KIS API responded with status ${response.status} for ${targetUrl}: ${errorText}`);
      return new Response(JSON.stringify({
        error: 'KIS API Error',
        message: `KIS API responded with status ${response.status}`,
        details: errorText,
        targetUrl: targetUrl
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError: any) {
      const rawResponseText = await response.text();
      console.error(`Failed to parse KIS API response as JSON for ${targetUrl}. Raw response: ${rawResponseText}. Error: ${jsonError.message}`);
      return new Response(JSON.stringify({
        error: 'Proxy Error',
        message: 'Failed to parse KIS API response as JSON',
        details: rawResponseText,
        originalError: jsonError.message,
        targetUrl: targetUrl
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error(`Unhandled Proxy Error: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: 'Proxy Error', 
      message: 'An unexpected error occurred in the proxy function',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
