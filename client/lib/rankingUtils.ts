import { chunkedFetchStockPrices, redis } from './kisApi';
import { allKrxStocks, stockCodeToNameMap, type Stock } from './dataLoader'; // Import Stock interface

const RANKING_CACHE_KEY = 'all_stocks_for_ranking';
const RANKING_CACHE_TTL = 600; // Cache for 10 minutes

export const fetchAllStockDataAndCache = async () => {
    console.log("Starting to fetch all stock data for ranking cache...");
    try {
        const allStockCodes = allKrxStocks.map(s => s.code);
        console.log(`Using ${allStockCodes.length} stock codes from krx_stocks.json to fetch data.`);

        const validResults = await chunkedFetchStockPrices(allStockCodes, stockCodeToNameMap, 20, 500); // 20 stocks per chunk, 500ms delay

        if (validResults.length > 0) {
            await redis.set(RANKING_CACHE_KEY, validResults, { ex: RANKING_CACHE_TTL });
            console.log(`Successfully cached data for ${validResults.length} stocks in Upstash Redis. Ranking cache is now fully populated. Expires in ${RANKING_CACHE_TTL}s.`);
        } else {
            console.warn("No valid stock data fetched to populate ranking cache.");
        }
    } catch (error: any) { // Explicitly type error
        console.error("Failed to fetch and cache all stock data for ranking:", error);
    }
};

export const getRankedStocks = async (type: string, limit: number = 50): Promise<Stock[]> => { // Return type Stock[]
    const allStocks = await redis.get<Stock[]>(RANKING_CACHE_KEY); // Type allStocks as Stock[]
    if (!allStocks) {
        console.warn("Ranking cache is empty or expired, attempting to re-fetch.");
        // Optionally trigger a background re-fetch here, or rely on cron job
        await fetchAllStockDataAndCache(); // Attempt to re-fetch immediately
        const reFetchedStocks = await redis.get<Stock[]>(RANKING_CACHE_KEY); // Type reFetchedStocks as Stock[]
        if (!reFetchedStocks) {
            return []; // Still no data after re-fetch
        }
        return getRankedStocks(type, limit); // Recurse with newly fetched data
    }

    let sortedStocks: Stock[] = []; // Type sortedStocks as Stock[]

    switch(type) {
        case 'gainer':
            sortedStocks = [...allStocks].sort((a: Stock, b: Stock) => (b.changeRate || 0) - (a.changeRate || 0));
            break;
        case 'loser':
            sortedStocks = [...allStocks].sort((a: Stock, b: Stock) => (a.changeRate || 0) - (b.changeRate || 0));
            break;
        case 'volume':
            sortedStocks = [...allStocks].sort((a: Stock, b: Stock) => (b.volume || 0) - (a.volume || 0));
            break;
        case 'value':
            sortedStocks = [...allStocks].sort((a: Stock, b: Stock) => (b.tradeValue || 0) - (a.tradeValue || 0));
            break;
        default:
            return []; // Invalid ranking type
    }
    
    return sortedStocks.slice(0, limit);
};