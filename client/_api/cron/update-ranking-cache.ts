import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchAllStockDataAndCache } from '../lib/rankingUtils';

export default async function (req: VercelRequest, res: VercelResponse) {
    // This endpoint is intended to be called by a Vercel Cron Job.
    // In a real application, you might want to add authentication/authorization
    // to ensure only Vercel Cron can trigger this.

    if (req.method !== 'GET') { // Cron jobs typically make GET requests
        return res.status(405).json({ error: 'Method Not Allowed', message: 'This endpoint only supports GET requests.' });
    }

    try {
        console.log('Cron job: Starting ranking cache update...');
        await fetchAllStockDataAndCache();
        console.log('Cron job: Ranking cache update completed.');
        res.status(200).json({ message: 'Ranking cache updated successfully.' });
    } catch (error: any) {
        console.error('Cron job: Failed to update ranking cache:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred during cache update.' });
    }
}