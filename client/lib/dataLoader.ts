import fs from 'fs';
import path from 'path';

// Define types for clarity
export interface Stock { // Added export
    code: string;
    name: string;
    market: string;
    price?: number; // Add optional properties that might be added later by fetchStockPrice
    changeRate?: number;
    volume?: number;
    tradeValue?: number;
}

export interface ThemeStock { // Added export
    code: string;
    name: string;
}

export interface Theme { // Added export
    theme_name: string;
    stocks: ThemeStock[];
}

let themesData: Theme[] = [];
let allKrxStocks: Stock[] = [];
const stockCodeToNameMap = new Map<string, string>();

try {
    const publicDir = path.join(process.cwd(), 'public');

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
}

export { themesData, allKrxStocks, stockCodeToNameMap };
