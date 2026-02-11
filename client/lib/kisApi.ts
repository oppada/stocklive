import { Redis } from '@upstash/redis';
import axios from 'axios';
import * as NodeCache from 'node-cache';

// --- Redis Client Initialization ---
// Prioritize UPSTASH_REDIS_REST_URL/TOKEN as expected by Redis.fromEnv()
// Fallback to REDIS_URL and KV_REST_API_TOKEN if they are auto-configured by Vercel
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redis: Redis;
if (redisUrl && redisToken) {
    redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });
} else {
    console.error('Upstash Redis environment variables are not properly configured. Check UPSTASH_REDIS_REST_URL/TOKEN or REDIS_URL/KV_REST_API_TOKEN.');
    // Provide a dummy Redis client to prevent crashes during development/testing without Redis
    redis = {
        get: async () => null,
        set: async () => {},
        // Add other Redis methods used in the app as dummy functions if needed
    } as unknown as Redis; // Cast to Redis to satisfy type checker
}

// --- Environment Variables for KIS API ---
const KIS_APP_KEY = process.env.VITE_KIS_APP_KEY;
const KIS_SECRET_KEY = process.env.VITE_KIS_APP_SECRET;
const KIS_BASE_URL = (process.env.VITE_KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443').trim().replace(/\/$/, "");

// Basic validation for KIS environment variables
if (!KIS_APP_KEY || !KIS_SECRET_KEY || !KIS_BASE_URL) {
    console.error('KIS API environment variables are not completely set. Please check VITE_KIS_APP_KEY, VITE_KIS_APP_SECRET, VITE_KIS_BASE_URL.');
}

// NodeCache for local in-memory caching for development or if Redis is not configured
const localKisPriceCache = new NodeCache.default({ stdTTL: 60 });
const localKisTokenCache = new NodeCache.default({ stdTTL: 86400 });

// Helper to get KIS API base headers
const getKisHeaders = (token?: string) => {
    const headers: { [key: string]: string } = {
        'Content-Type': 'application/json; charset=UTF-8',
        'appkey': KIS_APP_KEY!,
        'appsecret': KIS_SECRET_KEY!,
        'custtype': 'P',
    };
    if (token) {
        headers['authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- KIS Token Management ---
export const getKisToken = async (): Promise<string | null> => {
    // Try to get from Redis first
    try {
        if (redisUrl && redisToken) { // Only try Redis if configured
            const cachedToken = await redis.get<string>('kis-token');
            if (cachedToken) {
                console.log('Returning cached KIS token from Upstash Redis.');
                return cachedToken;
            }
        }
    } catch (redisError) {
        console.warn('Could not retrieve KIS token from Upstash Redis (falling back to local cache/new fetch):', redisError);
    }

    // Fallback to local cache if Redis fails or is empty
    if (localKisTokenCache.has('token')) {
        console.log('Returning cached KIS token from local cache.');
        return localKisTokenCache.get('token') as string;
    }

    console.log('Fetching new KIS token from KIS API...');
    try {
        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            appkey: KIS_APP_KEY,
            appsecret: KIS_SECRET_KEY,
            grant_type: 'client_credentials'
        }, { headers: { 'Content-Type': 'application/json' }});
        
        const token = response.data.access_token;
        const expiresInSeconds = response.data.expires_in ? response.data.expires_in - 120 : 86340;

        // Cache in Redis if configured
        try {
            if (redisUrl && redisToken) {
                await redis.set('kis-token', token, { ex: expiresInSeconds });
                console.log(`New KIS token cached in Upstash Redis. Expires in: ${expiresInSeconds} seconds.`);
            }
        } catch (redisError) {
            console.error('Failed to cache KIS token in Upstash Redis:', redisError);
        }
        
        localKisTokenCache.set('token', token, expiresInSeconds);
        console.log("New KIS Token Issued Successfully.");
        return token;
    } catch (error: any) {
        console.error('Error fetching KIS token:', error.response ? error.response.data : error.message);
        return null;
    }
};

// --- Stock Price Fetching ---
export const fetchStockPrice = async (stockCode: string, nameMap: Map<string, string>): Promise<any | null> => {
    const cacheKey = `price_${stockCode}`;
    // Try to get from Redis first
    try {
        if (redisUrl && redisToken) { // Only try Redis if configured
            const cachedPrice = await redis.get<any>(cacheKey);
            if (cachedPrice) {
                // console.log(`Returning cached price for ${stockCode} from Upstash Redis.`);
                return cachedPrice;
            }
        }
    } catch (redisError) {
        console.warn(`Could not retrieve price for ${stockCode} from Upstash Redis (falling back to local cache/new fetch):`, redisError);
    }

    // Fallback to local cache if Redis fails or is empty
    if (localKisPriceCache.has(cacheKey)) {
        // console.log(`Returning cached price for ${stockCode} from local cache.`);
        return localKisPriceCache.get(cacheKey);
    }

    const token = await getKisToken();
    if (!token) {
        console.error(`Failed to get KIS token for fetching price for ${stockCode}.`);
        return null;
    }

    try {
        const response = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
            headers: {
                ...getKisHeaders(token),
                'tr_id': 'FHKST01010100',
            },
            params: { 'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': stockCode },
            timeout: 5000
        });

        const output = response.data.output;
        if (!output) {
            console.warn(`No output data for stock ${stockCode} from KIS API.`);
            return null;
        }

        const data = {
            code: stockCode,
            price: parseInt(output.stck_prpr || '0'),
            changeRate: parseFloat(output.prdy_ctrt || '0'),
            volume: parseInt(String(output.acml_vol || '0').replace(/,/g, '')),
            tradeValue: parseInt(String(output.acml_tr_pbmn || '0').replace(/,/g, '')),
            name: nameMap.get(stockCode) || output.hts_korp_isnm || stockCode,
        };

        const priceCacheTTL = 60;

        // Cache in Redis if configured
        try {
            if (redisUrl && redisToken) {
                await redis.set(cacheKey, data, { ex: priceCacheTTL });
                // console.log(`Cached price for ${stockCode} in Upstash Redis.`);
            }
        } catch (redisError) {
            console.error(`Failed to cache price for ${stockCode} in Upstash Redis:`, redisError);
        }

        localKisPriceCache.set(cacheKey, data, priceCacheTTL);
        return data;
    } catch (error: any) {
        console.error(`Error fetching stock price for ${stockCode}:`, error.response ? error.response.data : error.message);
        return null;
    }
};

// --- Chunked Fetching for multiple stocks (used by themes and rankings) ---
export const chunkedFetchStockPrices = async (stockCodesToFetch: string[], nameMap: Map<string, string>, chunkSize = 10, delayMs = 500): Promise<any[]> => {
    const allResults = [];
    const token = await getKisToken();
    if (!token) {
        console.error("No KIS token available for chunked fetch.");
        return [];
    }

    for (let i = 0; i < stockCodesToFetch.length; i += chunkSize) {
        const chunk = stockCodesToFetch.slice(i, i + chunkSize);
        const promises = chunk.map(code => fetchStockPrice(code, nameMap));
        const chunkResults = await Promise.all(promises);
        allResults.push(...chunkResults.filter(Boolean));

        if (i + chunkSize < stockCodesToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return allResults;
};

// Also export the Redis client for direct use in other functions if needed
export { redis };