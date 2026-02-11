import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRankedStocks } from '../../lib/rankingUtils';

export default async function (req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type } = req.query;

    if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Ranking type is required.' });
    }

    const validRankingTypes = ['gainer', 'loser', 'volume', 'value'];
    if (!validRankingTypes.includes(type)) {
        return res.status(400).json({ error: 'Bad Request', message: `Invalid ranking type: ${type}. Valid types are ${validRankingTypes.join(', ')}.` });
    }

    try {
        const rankedStocks = await getRankedStocks(type, 50); // Get top 50
        if (rankedStocks.length === 0) {
            return res.status(200).json({ message: "Ranking data is currently being prepared or unavailable. Please try again in a moment.", data: [] });
        }
        res.status(200).json(rankedStocks);
    } catch (error: any) {
        console.error(`API /api/ranking/${type} error:`, error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred.' });
    }
}