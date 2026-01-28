// api/uapi/[...path].ts

// In-memory cache for KIS access token
let kisTokenCache: { token: string; expiresAt: number } | null = null;

export default async function handler(req: Request) {
  // Read APPKEY and APPSECRET from environment variables
  const APPKEY = process.env.VITE_KIS_APP_KEY;
  const APPSECRET = process.env.VITE_KIS_APP_SECRET;
  const KIS_BASE_URL = process.env.VITE_KIS_BASE_URL;

  console.log('APPKEY length:', APPKEY ? APPKEY.length : 'undefined');
  console.log('APPSECRET length:', APPSECRET ? APPSECRET.length : 'undefined');
  console.log('KIS_BASE_URL:', KIS_BASE_URL);
  
  if (!APPKEY || !APPSECRET || !KIS_BASE_URL) {
    console.error('Environment variables VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, or VITE_KIS_BASE_URL are not set.');
    return new Response(JSON.stringify({ 
      error: 'Configuration Error', 
      message: 'Server-side environment variables are not completely set.',
      details: 'Please ensure VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, and VITE_KIS_BASE_URL are configured in your Vercel project environment variables.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const headers = req.headers as unknown as Record<string, string>;
    console.log('Raw req.url:', req.url); // Added for debugging
    let url;
    let clientPath: string; // Declare clientPath here
    let searchParams: string; // Declare searchParams here
    try {
      console.log('typeof req.headers:', typeof headers);
      console.log('req.headers:', headers);
      const xForwardedProto = headers['x-forwarded-proto'] || 'http';
      const host = headers['host'] || 'localhost';
      url = new URL(req.url, `${xForwardedProto}://${host}`);
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
      targetUrl = `${KIS_BASE_URL}/${clientPath}${searchParams}`;
    } else {
      // For other KIS API calls, keep the '/uapi' prefix
      targetUrl = `${KIS_BASE_URL}/uapi/${clientPath}${searchParams}`;
    }

    let requestHeaders = new Headers();
    let requestBody: string | undefined;
    let requestMethod = req.method;

    if (clientPath === 'oauth2/tokenP') {
      // Check cache first for KIS token
      const currentTime = Date.now();
      if (kisTokenCache && kisTokenCache.expiresAt > currentTime) {
        console.log('Returning cached KIS token from in-memory cache.');
        return new Response(JSON.stringify({ access_token: kisTokenCache.token }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      console.log('Fetching new KIS token (or cached token expired) from KIS API.');

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
      requestHeaders.set('appkey', headers['appkey'] || '');
      requestHeaders.set('appsecret', headers['appsecret'] || '');
      requestHeaders.set('authorization', headers['authorization'] || '');
      requestHeaders.set('tr_id', headers['tr_id'] || '');
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
      // Update in-memory cache
      if (data.access_token && data.expires_in) {
        // KIS 'expires_in' is in seconds, cache for slightly less to avoid using an expired token
        const expiresAt = Date.now() + (data.expires_in - 60) * 1000; // Cache for (expires_in - 60) seconds
        kisTokenCache = { token: data.access_token, expiresAt };
        console.log('New KIS token cached in memory. Expires at:', new Date(expiresAt));
      }
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
