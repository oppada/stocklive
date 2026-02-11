import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chunkedFetchStockPrices, redis } from '../../lib/kisApi'; // Adjust path as necessary
import { themesData, stockCodeToNameMap } from '../../lib/dataLoader'; // Adjust path as necessary

export default async function (req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const cacheKey = 'theme_ranking_results';
    const THEME_RANKING_CACHE_TTL = 300; // 5 minutes

    try {
        // Try to get from Redis cache first
        const cachedRanking = await redis.get<any[]>(cacheKey);
        if (cachedRanking) {
            console.log("Returning theme ranking from Upstash Redis cache.");
            return res.status(200).json(cachedRanking);
        }

        // 1. Get all unique stock codes from all themes
        const allThemeStockCodes = Array.from(new Set(themesData.flatMap(t => t.stocks.map(s => s.code))));
        
        // 2. Fetch prices for all unique stock codes using chunking
        const allFetchedStocks = await chunkedFetchStockPrices(allThemeStockCodes, stockCodeToNameMap, 10, 500); // 10 stocks per chunk, 500ms delay
        const priceMap = new Map(allFetchedStocks.map(r => [r.code, r]));

        // 3. Calculate avgChangeRate for each theme using the comprehensive priceMap
        const result = themesData.map(t => {
            const stocksWithPrices = t.stocks.map(s => priceMap.get(s.code)).filter(Boolean);
            const avg = stocksWithPrices.length ? stocksWithPrices.reduce((a, b) => a + b.changeRate, 0) / stocksWithPrices.length : 0;
            return { name: t.theme_name, avgChangeRate: avg, stocks: stocksWithPrices.map(s => ({ code: s.code, name: s.name, changeRate: s.changeRate })) };
        }).sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        // Cache the result in Redis
        await redis.set(cacheKey, result, { ex: THEME_RANKING_CACHE_TTL });
        console.log(`Theme ranking cached in Upstash Redis. Expires in: ${THEME_RANKING_CACHE_TTL} seconds.`);
        
        res.status(200).json(result);
    } catch (error: any) {
        console.error("API /api/themes/top-performing error:", error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred.' });
    }
}