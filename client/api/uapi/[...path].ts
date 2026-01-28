// api/uapi/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// import { Redis } from '@upstash/redis';
// const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Read APPKEY and APPSECRET from environment variables
  const APPKEY = process.env.VITE_KIS_APP_KEY;
  const APPSECRET = process.env.VITE_KIS_APP_SECRET;
  const KIS_BASE_URL = process.env.VITE_KIS_BASE_URL;

  console.log('APPKEY length:', APPKEY ? APPKEY.length : 'undefined');
  console.log('APPSECRET length:', APPSECRET ? APPSECRET.length : 'undefined');
  console.log('KIS_BASE_URL:', KIS_BASE_URL);
  
  if (!APPKEY || !APPSECRET || !KIS_BASE_URL) {
    console.error('Environment variables VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, or VITE_KIS_BASE_URL are not set.');
    return res.status(500).json({ 
      error: 'Configuration Error', 
      message: 'Server-side environment variables are not completely set.',
      details: 'Please ensure VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, and VITE_KIS_BASE_URL are configured in your Vercel project environment variables.'
    });
  }

  try {
    const headers = req.headers;
    console.log('Raw req.url:', req.url); // Example: /api/uapi/oauth2/tokenP
    
    let url: URL;
    let clientPath: string;
    let searchParams: string;

    try {
      console.log('typeof req.headers:', typeof headers);
      console.log('req.headers:', headers);
      const host = headers['host'] || 'localhost';
      const protocol = headers['x-forwarded-proto'] || 'http';
      // req.url is only the path and query string, so we need to construct the full URL
      url = new URL(req.url!, `${protocol}://${host}`);
      clientPath = url.pathname.replace('/api/uapi/', '');
      searchParams = url.search;
    } catch (urlError: any) {
      console.error(`Error parsing req.url: ${urlError.message}, Raw req.url: ${req.url}`);
      return res.status(500).json({ 
        error: 'URL Parsing Error', 
        message: 'Could not parse the request URL.',
        details: urlError.message,
        rawUrl: req.url
      });
    }

    let targetUrl;
    // Determine the correct target URL based on the clientPath
    if (clientPath === 'oauth2/tokenP') {
      targetUrl = `${KIS_BASE_URL}/${clientPath}${searchParams}`;
    } else {
      targetUrl = `${KIS_BASE_URL}/uapi/${clientPath}${searchParams}`;
    }

    let requestHeaders = new Headers();
    let requestBody: string | undefined;
    let requestMethod = req.method;

    if (clientPath === 'oauth2/tokenP') {
      // DEBUGGING STEP: Return a dummy response immediately
      console.log('DEBUG: Bypassing external calls and returning dummy token.');
      return res.status(200).json({ access_token: "dummy-token-for-debugging" });

      /*
      // Original logic to be restored later
      console.log('Fetching new KIS token (cache empty or expired) from KIS API.');
      requestMethod = 'POST';
      requestBody = JSON.stringify({
        'grant_type': 'client_credentials',
        'appkey': APPKEY,
        'appsecret': APPSECRET
      });
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      */
    } else {
      // General handling for other KIS API calls
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      // VercelRequest['headers'] doesn't have .get, access with brackets
      requestHeaders.set('appkey', (headers['appkey'] as string) || '');
      requestHeaders.set('appsecret', (headers['appsecret'] as string) || '');
      requestHeaders.set('authorization', (headers['authorization'] as string) || '');
      requestHeaders.set('tr_id', (headers['tr_id'] as string) || '');
      requestHeaders.set('custtype', 'P');
      if (req.method !== 'GET' && req.body) {
        requestBody = JSON.stringify(req.body);
      }
    }

    // This part is unreachable for 'oauth2/tokenP' path during this debug step
    const response = await fetch(targetUrl, {
      method: requestMethod,
      headers: requestHeaders,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`KIS API responded with status ${response.status} for ${targetUrl}: ${errorText}`);
      return res.status(response.status).json({
        error: 'KIS API Error',
        message: `KIS API responded with status ${response.status}`,
        details: errorText,
        targetUrl: targetUrl
      });
    }

    let data;
    try {
      data = await response.json();
      //
      // Caching logic will be re-inserted here later
      //
    } catch (jsonError: any) {
      const rawResponseText = await response.text();
      console.error(`Failed to parse KIS API response as JSON for ${targetUrl}. Raw response: ${rawResponseText}. Error: ${jsonError.message}`);
      return res.status(500).json({
        error: 'Proxy Error',
        message: 'Failed to parse KIS API response as JSON',
        details: rawResponseText,
        originalError: jsonError.message,
        targetUrl: targetUrl
      });
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`Unhandled Proxy Error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: 'An unexpected error occurred in the proxy function',
      details: error.message
    });
  }
}