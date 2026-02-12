// server/localTokenServer.js 수정본
import fetch from 'node-fetch';
import http from 'http';
import url from 'url';
import dotenv from 'dotenv';
import path from 'path'; // path 모듈 추가
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [수정] 회사 경로 하드코딩 제거 -> 현재 실행 경로(process.cwd()) 기준으로 변경
// dotenv.config({ path: path.join(process.cwd(), '.env.local') });
// Resolve the path to .env.local relative to the script's directory
const pathToEnv = path.resolve(__dirname, '.env');
dotenv.config({ path: pathToEnv });

let cachedToken = null;
let tokenExpiry = 0; // Timestamp when the token expires
let fetchTokenPromise = null; // New variable to hold the pending token fetch promise

// Environment variables are now read once when the server starts
// Note: These will be read from process.env when this script is run directly.
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_SECRET_KEY;
const KIS_BASE_URL = process.env.KIS_BASE_URL;
export const LOCAL_TOKEN_SERVER_PORT = process.env.LOCAL_TOKEN_SERVER_PORT || 3001; // Port for this server

async function fetchNewKisToken() {
  if (!KIS_APP_KEY || !KIS_APP_SECRET || !KIS_BASE_URL) {
    console.error('Server-side environment variables (VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, VITE_KIS_BASE_URL) are not completely set.');
    throw new Error('Missing KIS API credentials');
  }

  console.log('[Local Token Server] Fetching new KIS token from KIS API.');
  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Local Token Server] KIS API token fetch failed with status ${response.status}: ${errorText}`);
    throw new Error(`KIS API token fetch failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.access_token && data.expires_in) {
    cachedToken = data.access_token;
    // Cache for slightly less time than actual expiry to be safe
    tokenExpiry = new Date().getTime() + (data.expires_in - 120) * 1000;
    console.log(`[Local Token Server] New KIS token cached locally. Expires at: ${new Date(tokenExpiry).toLocaleString()}`);
    return cachedToken;
  } else {
    throw new Error('Failed to get access_token or expires_in from KIS API response.');
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Allow CORS from Vite dev server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle only POST requests to the root path for token acquisition
  if (req.method === 'POST' && parsedUrl.pathname === '/') {
    console.log('[Local Token Server] Received POST request for token.');

    if (cachedToken && new Date().getTime() < tokenExpiry) {
      console.log('[Local Token Server] Returning cached KIS token.');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: cachedToken }));
      return;
    }

    if (fetchTokenPromise) {
      console.log('[Local Token Server] Another token fetch is in progress. Waiting...');
      try {
        await fetchTokenPromise; // Wait for the ongoing fetch to complete
      } catch (error) {
        console.error('[Local Token Server] Error in ongoing token fetch:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
        return;
      }

      if (cachedToken && new Date().getTime() < tokenExpiry) {
        console.log('[Local Token Server] Returning newly cached KIS token after waiting.');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: cachedToken }));
        return;
      }
    }

    try {
      console.log('[Local Token Server] No valid token, initiating new fetch.');
      fetchTokenPromise = fetchNewKisToken(); // Start fetch and store its promise
      const token = await fetchTokenPromise; // Wait for it to complete
      fetchTokenPromise = null; // Clear the promise once done

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: token }));
    } catch (error) {
      fetchTokenPromise = null; // Clear the promise on error too
      console.error('[Local Token Server] Error handling token request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(LOCAL_TOKEN_SERVER_PORT, () => {
  console.log(`[Local Token Server] Listening on port ${LOCAL_TOKEN_SERVER_PORT}`);
  console.log(`KIS_APP_KEY: ${KIS_APP_KEY ? 'Set' : 'Not Set'}`);
  console.log(`KIS_APP_SECRET: ${KIS_APP_SECRET ? 'Set' : 'Not Set'}`);
  console.log(`KIS_BASE_URL: ${KIS_BASE_URL}`);
});