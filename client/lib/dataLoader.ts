import * as fs from 'fs';
import * as path from 'path';

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
    console.log("dataLoader: process.cwd():", process.cwd());
    const publicDir = path.join(process.cwd(), 'public'); 
    console.log("dataLoader: publicDir:", publicDir);

    const themesPath = path.join(publicDir, 'toss_real_150_themes.json');
    console.log("dataLoader: themesPath:", themesPath);
    const krxStocksPath = path.join(publicDir, 'krx_stocks.json');
    console.log("dataLoader: krxStocksPath:", krxStocksPath);

    // Load Themes Data
    const rawThemesData = fs.readFileSync(themesPath, 'utf8');
    themesData = JSON.parse(rawThemesData).themes;
    themesData.forEach(t => t.stocks.forEach(s => stockCodeToNameMap.set(s.code, s.name)));
    console.log(`dataLoader: Loaded ${themesData.length} themes.`);

    // Load KRX Stocks Data
    const rawKrxStocksData = fs.readFileSync(krxStocksPath, 'utf8');
    allKrxStocks = JSON.parse(rawKrxStocksData);
    allKrxStocks.forEach(s => stockCodeToNameMap.set(s.code, s.name));
    console.log(`dataLoader: Loaded ${allKrxStocks.length} stocks from krx_stocks.json.`);

} catch (e: any) {
    console.error("dataLoader: Error loading data files:", e.message);
}

export { themesData, allKrxStocks, stockCodeToNameMap };
