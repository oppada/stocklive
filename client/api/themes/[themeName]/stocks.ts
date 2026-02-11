import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchStockPrice, getKisToken } from '../../../lib/kisApi';
import { themesData, stockCodeToNameMap, type Theme, type Stock } from '../../../lib/dataLoader'; // Changed to type-only imports

export default async function (req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { themeName } = req.query;

    if (!themeName || typeof themeName !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Theme name is required.' });
    }

    try {
        // Explicitly type 't'
        const theme = themesData.find((t: Theme) => t.theme_name === themeName);
        if (!theme) {
            return res.status(404).json({ error: 'Not Found', message: `Theme "${themeName}" not found.` });
        }

        const token = await getKisToken();
        if (!token) {
            return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get KIS token.' });
        }

        // Filter for unique stock codes within the theme
        // Explicitly type 's'
        const uniqueStockCodes = Array.from(new Set(theme.stocks.map((s: { code: string; name: string }) => s.code)));
        
        const results = await Promise.all(
            uniqueStockCodes.map(code => fetchStockPrice(code, stockCodeToNameMap))
        );

        // Explicitly type 'Stock' for stocksWithPrices
        const stocksWithPrices: Stock[] = results.filter(Boolean); // Filter out any null results

        // Sort by changeRate as in original backend
        // Explicitly type 'a' and 'b' and handle undefined changeRate
        stocksWithPrices.sort((a: Stock, b: Stock) => (b.changeRate || 0) - (a.changeRate || 0)); // Updated sort logic

        res.status(200).json(stocksWithPrices);
    } catch (error: any) {
        console.error(`API /api/themes/${themeName}/stocks error:`, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred.' });
    }
}