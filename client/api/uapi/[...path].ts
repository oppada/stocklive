// api/uapi/[...path].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// Initialize the Redis client from environment variables
const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Read environment variables
  const APPKEY = process.env.VITE_KIS_APP_KEY;
  const APPSECRET = process.env.VITE_KIS_APP_SECRET;
  const KIS_BASE_URL = process.env.VITE_KIS_BASE_URL;

  // Validate environment variables
  if (!APPKEY || !APPSECRET || !KIS_BASE_URL) {
    console.error('Server-side environment variables are not completely set.');
    return res.status(500).json({ 
      error: 'Configuration Error', 
      message: 'One or more required environment variables are not set on the server.'
    });
  }

  try {
    // Safely parse the request URL
    if (!req.url) {
      return res.status(400).json({ error: 'Bad Request', message: 'Request URL is missing.' });
    }
    const host = req.headers['host'] || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const url = new URL(req.url, `${protocol}://${host}`);
    const clientPath = url.pathname.replace('/api/uapi/', '');
    const searchParams = url.search;

    let targetUrl;
    if (clientPath === 'oauth2/tokenP') {
      targetUrl = `${KIS_BASE_URL}/${clientPath}${searchParams}`;
    } else {
      targetUrl = `${KIS_BASE_URL}/uapi/${clientPath}${searchParams}`;
    }

    const requestHeaders = new Headers();
    let requestBody: string | undefined;
    let requestMethod = req.method || 'GET';

    // Handle token issuance path
    if (clientPath === 'oauth2/tokenP') {
      // 1. Check for a cached token in Upstash Redis
      const cachedToken = await redis.get<string>('kis-token');
      if (cachedToken) {
        console.log('Returning cached KIS token from Upstash Redis.');
        return res.status(200).json({ access_token: cachedToken });
      }

      // 2. If no cache, fetch a new token from KIS API
      console.log('Fetching new KIS token (cache empty or expired) from KIS API.');
      requestMethod = 'POST';
      requestBody = JSON.stringify({
        'grant_type': 'client_credentials',
        'appkey': APPKEY,
        'appsecret': APPSECRET
      });
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
    
    } else {
      // Handle all other API proxy paths
      requestHeaders.set('Content-Type', 'application/json; charset=UTF-8');
      
      // Safely forward headers from the client request
      const headersToForward = ['appkey', 'appsecret', 'authorization', 'tr_id'];
      for (const header of headersToForward) {
        const value = req.headers[header];
        if (typeof value === 'string') {
          requestHeaders.set(header, value);
        }
      }
      requestHeaders.set('custtype', 'P');

      if (requestMethod !== 'GET' && req.body) {
        requestBody = JSON.stringify(req.body);
      }
    }

    // Make the proxied request to the KIS API
    const response = await fetch(targetUrl, {
      method: requestMethod,
      headers: requestHeaders,
      body: requestBody,
    });

    // Handle unsuccessful KIS API responses
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

    const data = await response.json();

    // 3. If a new token was fetched, cache it in Redis
    if (clientPath === 'oauth2/tokenP' && data.access_token && data.expires_in) {
      const expiresInSeconds = data.expires_in - 120; // Cache for slightly less time
      await redis.set('kis-token', data.access_token, { ex: expiresInSeconds });
      console.log(`New KIS token cached in Upstash Redis. Expires in: ${expiresInSeconds} seconds.`);
    }

    // Return the final data to the client
    return res.status(200).json(data);

  } catch (error: any) {
    console.error(`Unhandled Proxy Error: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Proxy Error', 
      message: 'An unexpected error occurred in the proxy function.',
      details: error.message
    });
  }
}
