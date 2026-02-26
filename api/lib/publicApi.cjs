const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest'
};

const cleanNum = (str) => {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  return cleaned;
};

/**
 * 지수 데이터 수집
 */
const fetchPublicIndicator = async (name, symbol) => {
  try {
    if (symbol === '^KS11' || symbol === '^KQ11') {
      const code = symbol === '^KS11' ? 'KOSPI' : 'KOSDAQ';
      const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:${code}`;
      const response = await axios.get(url, { headers: NAVER_HEADERS, timeout: 5000 });
      const data = response.data?.result?.areas?.[0]?.datas?.[0];
      if (data) {
        return { price: parseFloat(data.nv) / 100, change: parseFloat(data.cv) / 100, changeRate: parseFloat(data.cr) };
      }
    }
    const worldUrl = 'https://finance.naver.com/world/';
    const response = await axios.get(worldUrl, { headers: NAVER_HEADERS, responseType: 'arraybuffer', timeout: 10000 });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    let result = null;
    $('table tr').each((i, el) => {
      const rowText = $(el).text();
      const searchName = name.replace('반도체', '필라델피아').replace('나스닥', '나스닥 종합');
      if (rowText.includes(searchName)) {
        const tds = $(el).find('td');
        if (tds.length >= 3) {
          const price = parseFloat(cleanNum(tds.eq(1).text()));
          const change = parseFloat(cleanNum(tds.eq(2).text()));
          const rate = parseFloat(cleanNum(tds.eq(3).text()));
          if (!isNaN(price) && price > 0) { result = { price, change, changeRate: rate }; return false; }
        }
      }
    });
    if (result) return result;
    const worldSymbolMap = { '다우산업': 'DJI@DJI', '나스닥': 'NAS@IXIC', 'S&P500': 'SPI@SPX' };
    const worldCode = worldSymbolMap[name];
    if (worldCode) {
      const url = `https://finance.naver.com/world/worldDayListJson.naver?symbol=${worldCode}&fdtc=0`;
      const res = await axios.get(url, { headers: NAVER_HEADERS, timeout: 5000 });
      const data = res.data?.[0];
      if (data) { return { price: parseFloat(data.clos), change: parseFloat(data.diff), changeRate: parseFloat(data.rate) }; }
    }
  } catch (e) { console.error(`❌ Indicator Fetch Error (${name}):`, e.message); }
  return { price: 0, change: 0, changeRate: 0 };
};

/**
 * 랭킹 데이터 수집
 */
const fetchNaverRankingsByScraping = async (type) => {
  const urlMap = {
    'volume': 'https://finance.naver.com/sise/sise_quant.naver',
    'gainer': 'https://finance.naver.com/sise/sise_rise.naver',
    'loser': 'https://finance.naver.com/sise/sise_fall.naver',
    'value': 'https://finance.naver.com/sise/sise_quant.naver?rankingType=amount'
  };
  const baseUrl = urlMap[type] || urlMap['volume'];
  const markets = [{ name: 'KOSPI', id: '0' }, { name: 'KOSDAQ', id: '1' }];
  let combinedResults = [];
  for (const market of markets) {
    try {
      const response = await axios.get(`${baseUrl}?sosok=${market.id}`, { responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000 });
      const html = iconv.decode(response.data, 'euc-kr');
      const $ = cheerio.load(html);
      $('table.type_2 tbody tr').each((i, el) => {
        const nameAnchor = $(el).find('a.tltle');
        if (nameAnchor.length > 0) {
          const name = nameAnchor.text().trim();
          const code = nameAnchor.attr('href').split('code=')[1];
          const tds = $(el).find('td');
          let rowData = { code, name, market: market.name };
          if (type === 'gainer' || type === 'loser') {
            rowData.price = parseFloat(cleanNum(tds.eq(2).text()));
            rowData.changeRate = parseFloat(cleanNum(tds.eq(4).text()));
            rowData.volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
            rowData.tradeValue = rowData.price * rowData.volume;
          } else {
            rowData.price = parseFloat(cleanNum(tds.eq(2).text()));
            rowData.changeRate = parseFloat(cleanNum(tds.eq(4).text()));
            rowData.volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
            rowData.tradeValue = parseInt(cleanNum(tds.eq(6).text())) * 1000000 || 0;
          }
          if (rowData.price > 0) combinedResults.push(rowData);
        }
      });
    } catch (e) { console.error(`❌ Scraping Error (${type}):`, e.message); }
  }
  const uniqueMap = new Map();
  combinedResults.forEach(item => { if (!uniqueMap.has(item.code)) uniqueMap.set(item.code, item); });
  const finalResults = Array.from(uniqueMap.values());
  if (type === 'gainer') finalResults.sort((a, b) => b.changeRate - a.changeRate);
  else if (type === 'loser') finalResults.sort((a, b) => a.changeRate - b.changeRate);
  else if (type === 'volume') finalResults.sort((a, b) => b.volume - a.volume);
  else if (type === 'value') finalResults.sort((a, b) => b.tradeValue - a.tradeValue);
  return finalResults.slice(0, 50);
};

/**
 * 투자자별 매매 동향 수집 (네이버 모바일 API 활용 - 404 방지 및 안정성 극대화)
 */
const fetchInvestorTrends = async (type = 'buy', investor = 'foreign') => {
  try {
    // 네이버 모바일 증권의 외국인/기관 순매수 상위 데이터 API
    // type: 1(외국인), 2(기관), 3(개인 - 단, 개인은 상위 노출이 제한적일 수 있음)
    const investorCode = investor === 'foreign' ? '1' : '2';
    const isBuy = type === 'buy';
    
    // 네이버 실시간 순매수/순매도 상위 API (모바일용)
    const url = `https://m.stock.naver.com/api/stock/ranking/netBuying?rankingType=${isBuy ? 'NET_BUY' : 'NET_SELL'}&investorType=${investorCode}&page=1&pageSize=50`;

    const response = await axios.get(url, { headers: NAVER_HEADERS, timeout: 10000 });
    const data = response.data;
    
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => ({
      code: item.stockCode,
      name: item.stockName,
      price: parseFloat(cleanNum(item.closePrice)),
      changeRate: parseFloat(cleanNum(item.fluctuationRate)),
      tradeValue: parseFloat(cleanNum(item.netBuyingVolume)) * parseFloat(cleanNum(item.closePrice)) // 거래대금 추산
    }));
  } catch (e) { 
    console.error(`❌ InvestorTrends API Error (${investor}_${type}):`, e.message);
    return []; 
  }
};

/**
 * 테마 정보 수집
 */
const fetchNaverThemes = async () => {
  try {
    const response = await axios.get('https://finance.naver.com/sise/theme.naver', { responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000 });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    const themes = [];
    $('table.type_1 tbody tr').each((i, el) => {
      const nameTag = $(el).find('td.col_type1 a');
      if (nameTag.length > 0) {
        const name = nameTag.text().trim();
        const href = nameTag.attr('href');
        const themeNo = href.split('no=')[1];
        const rate = parseFloat(cleanNum($(el).find('td.col_type2 span').text()));
        themes.push({ name, avgChangeRate: rate, no: themeNo });
      }
    });
    return themes.sort((a, b) => b.avgChangeRate - a.avgChangeRate).slice(0, 40);
  } catch (e) { return []; }
};

/**
 * 테마 종목 수집
 */
const fetchNaverThemeStocks = async (themeNo) => {
  if (!themeNo) return [];
  try {
    const url = `https://finance.naver.com/sise/sise_group_detail.naver?type=theme&no=${themeNo}`;
    const response = await axios.get(url, { responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000 });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    const stocks = [];
    $('table.type_5 tbody tr').each((i, el) => {
      const nameAnchor = $(el).find('a[href*="code="]');
      if (nameAnchor.length > 0) {
        const name = nameAnchor.text().trim().replace('*', '').trim();
        const code = nameAnchor.attr('href').split('code=')[1];
        const tds = $(el).find('td.number');
        if (tds.length >= 7) {
          const price = parseFloat(cleanNum(tds.eq(0).text()));
          const changeRate = parseFloat(cleanNum(tds.eq(2).text()));
          const volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
          const tradeValue = (parseInt(cleanNum(tds.eq(6).text())) || 0) * 1000000;
          stocks.push({ code, name, price, changeRate, volume, tradeValue });
        }
      }
    });
    return stocks;
  } catch (e) { return []; }
};

/**
 * 실시간 가격 수집
 */
const fetchNaverPrices = async (codes) => {
  if (!codes || codes.length === 0) return [];
  try {
    const query = codes.map(c => `SERVICE_ITEM:${c}`).join(',');
    const url = `https://polling.finance.naver.com/api/realtime?query=${query}`;
    const response = await axios.get(url, { headers: NAVER_HEADERS, timeout: 5000 });
    if (response.data?.result?.areas) {
      return response.data.result.areas[0].datas.map(d => ({
        code: d.cd, price: parseFloat(d.nv), change: parseFloat(d.cv), changeRate: parseFloat(d.cr),
        volume: parseFloat(d.aq), tradeValue: parseFloat(d.aa), name: d.nm
      }));
    }
  } catch (e) { console.error("❌ Naver Prices Fetch Error:", e.message); }
  return [];
};

module.exports = { 
  fetchPublicIndicator, 
  fetchNaverRankings: fetchNaverRankingsByScraping, 
  fetchNaverThemes, 
  fetchNaverThemeStocks,
  fetchInvestorTrends,
  fetchNaverPrices,
  cleanNum
};
