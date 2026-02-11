import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getKisToken, fetchStockPrice } from '../../lib/kisApi';
import { stockCodeToNameMap } from '../../lib/dataLoader';

export default async function (req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const codesParam = req.query.codes;
    const codes = Array.isArray(codesParam) 
        ? codesParam.join(',').split(',').filter(Boolean) 
        : (codesParam || "").split(',').filter(Boolean);

    if (codes.length === 0) {
        return res.status(400).json({ error: 'Bad Request', message: 'No stock codes provided.' });
    }

    try {
        const token = await getKisToken();
        if (!token) {
            return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get KIS token.' });
        }

        const results = await Promise.all(
            codes.map(c => fetchStockPrice(c.trim(), stockCodeToNameMap))
        );
        
        // Filter out null results and transform into an object with stock code as key
        const stockPrices = results.filter(Boolean).reduce((acc, stock) => {
            acc[stock.code] = stock;
            return acc;
        }, {});

        res.status(200).json(stockPrices);
    } catch (error: any) {
        console.error('API /api/stocks/prices error:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred.' });
    }
}