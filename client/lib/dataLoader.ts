import fs from 'fs';
import path from 'path';

// Define types for clarity
interface Stock {
    code: string;
    name: string;
    market: string;
}

interface ThemeStock {
    code: string;
    name: string;
}

interface Theme {
    theme_name: string;
    stocks: ThemeStock[];
}

let themesData: Theme[] = [];
let allKrxStocks: Stock[] = [];
const stockCodeToNameMap = new Map<string, string>();

try {
    // __dirname in Vercel Serverless Functions points to the function's directory.
    // For files in `public`, they are typically accessible relative to the project root.
    // Given the Vercel Root Directory is `client`, the `public` folder will be `client/public`.
    // We need to resolve the path correctly for both local development and Vercel.
    
    // For local development with `vite.config.ts` proxying, `process.cwd()` is `client`.
    // For Vercel serverless functions, `process.cwd()` is likely also `client`'s root.
    // So, relative pathing should work from there.

    const publicDir = path.join(process.cwd(), 'public'); // Assumes public is directly under client root

    const themesPath = path.join(publicDir, 'toss_real_150_themes.json');
    const krxStocksPath = path.join(publicDir, 'krx_stocks.json');

    // Load Themes Data
    const rawThemesData = fs.readFileSync(themesPath, 'utf8');
    themesData = JSON.parse(rawThemesData).themes;
    themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
    console.log(`Loaded ${themesData.length} themes.`);

    // Load KRX Stocks Data
    const rawKrxStocksData = fs.readFileSync(krxStocksPath, 'utf8');
    allKrxStocks = JSON.parse(rawKrxStocksData);
    allKrxStocks.forEach(s => stockCodeToNameMap.set(s.code, s.name));
    console.log(`Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);

} catch (e: any) {
    console.error("Error loading data files:", e.message);
    // In a production environment, you might want to throw an error or have default data.
}

export { themesData, allKrxStocks, stockCodeToNameMap };