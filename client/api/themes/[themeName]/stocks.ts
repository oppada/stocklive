import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchStockPrice, getKisToken } from '../../lib/kisApi';
import { themesData, stockCodeToNameMap } from '../../lib/dataLoader';

export default async function (req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { themeName } = req.query;

    if (!themeName || typeof themeName !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Theme name is required.' });
    }

    try {
        const theme = themesData.find(t => t.theme_name === themeName);
        if (!theme) {
            return res.status(404).json({ error: 'Not Found', message: `Theme "${themeName}" not found.` });
        }

        const token = await getKisToken();
        if (!token) {
            return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get KIS token.' });
        }

        // Filter for unique stock codes within the theme
        const uniqueStockCodes = Array.from(new Set(theme.stocks.map(s => s.code)));
        
        const results = await Promise.all(
            uniqueStockCodes.map(code => fetchStockPrice(code, stockCodeToNameMap))
        );

        const stocksWithPrices = results.filter(Boolean); // Filter out any null results

        // Sort by changeRate as in original backend
        stocksWithPrices.sort((a, b) => b.changeRate - a.changeRate);

        res.status(200).json(stocksWithPrices);
    } catch (error: any) {
        console.error(`API /api/themes/${themeName}/stocks error:`, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred.' });
    }
}