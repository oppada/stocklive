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
          
          // 상한가/하한가 감지 (네이버 아이콘 기준)
          const isUpperLimit = $(el).find('img[src*="ico_up7.gif"]').length > 0;
          const isLowerLimit = $(el).find('img[src*="ico_down7.gif"]').length > 0;

          let rowData = { 
            code, 
            name, 
            market: market.name,
            isUpperLimit,
            isLowerLimit
          };
          
          if (type === 'gainer' || type === 'loser') {
            rowData.price = parseFloat(cleanNum(tds.eq(2).text()));
            rowData.change = parseFloat(cleanNum(tds.eq(3).text()));
            rowData.changeRate = parseFloat(cleanNum(tds.eq(4).text()));
            rowData.volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
            rowData.tradeValue = rowData.price * rowData.volume;
          } else {
            rowData.price = parseFloat(cleanNum(tds.eq(2).text()));
            rowData.change = parseFloat(cleanNum(tds.eq(3).text()));
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
 * 투자자별 매매 동향 수집 (네이버 모바일 API - 완벽 위장 및 404 방지 버전)
 */
const fetchInvestorTrends = async (type = 'buy', investor = 'foreign') => {
  try {
    const investorCode = investor === 'foreign' ? 'FOREIGN' : 'INSTITUTION';
    const typeCode = type === 'buy' ? 'BUY' : 'SELL';
    
    // 코스피와 코스닥 두 시장 모두 수집하여 통합
    const markets = ['KOSPI', 'KOSDAQ'];
    let combinedList = [];

    // 🚀 모바일 브라우저 완벽 위장 헤더
    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://m.stock.naver.com',
      'Referer': 'https://m.stock.naver.com/',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    for (const market of markets) {
      const url = `https://m.stock.naver.com/api/stock/exchange/${market}/investor/${market}_${investorCode}/${typeCode}?pageSize=30`;
      
      try {
        const response = await axios.get(url, { headers, timeout: 10000 });
        if (response.data && response.data.list) {
          const mapped = response.data.list.map(item => ({
            code: item.itemCode,
            name: item.stockName,
            price: parseFloat(cleanNum(item.closePrice)),
            change: parseFloat(cleanNum(item.compareToPreviousClosePrice)),
            changeRate: parseFloat(cleanNum(item.fluctuationRate)),
            // 거래대금 추산 (현재가 * 순매수량)
            tradeValue: parseFloat(cleanNum(item.closePrice)) * Math.abs(parseInt(cleanNum(item.accumulatedNetPurchaseQuantity)) || 0),
            isUpperLimit: false,
            isLowerLimit: false
          }));
          combinedList = [...combinedList, ...mapped];
        }
      } catch (err) {
        console.error(`⚠️ [InvestorTrends] ${market} 수집 실패:`, err.message);
      }
    }

    // 등락률 순으로 정렬하여 상위 50개 반환
    return combinedList.sort((a, b) => b.changeRate - a.changeRate).slice(0, 50);
  } catch (e) { 
    console.error(`❌ InvestorTrends Final Error (${investor}_${type}):`, e.message);
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
          const change = parseFloat(cleanNum(tds.eq(1).text()));
          const changeRate = parseFloat(cleanNum(tds.eq(2).text()));
          const volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
          const tradeValue = (parseInt(cleanNum(tds.eq(6).text())) || 0) * 1000000;
          stocks.push({ code, name, price, change, changeRate, volume, tradeValue });
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

/**
 * 토스증권 투자자별 매매 동향 수집 (순수 API 방식 - Vercel 최적화)
 */
const fetchTossInvestorTrends = async () => {
  try {
    // 토스증권 실시간 수급 데이터 API (모바일/웹 공용)
    const url = 'https://wapi.tossinvest.com/v1/charts/investor-trend/domestic';
    const response = await axios.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Origin': 'https://tossinvest.com',
        'Referer': 'https://tossinvest.com/'
      },
      timeout: 10000 
    });

    const data = response.data;
    if (!data || !data.buy || !data.sell) return null;

    // 토스 API 데이터 구조를 기존 앱 호환 형식으로 변환
    const mapList = (list) => (list || []).map(item => ({
      code: item.stockCode,
      name: item.stockName,
      price: item.closePrice,
      changeRate: item.fluctuationRate,
      tradeValue: item.netBuyingPriceText // "121억" 등 텍스트 그대로 사용
    }));

    return {
      updated_at_text: data.baseTimeText || '', // "오늘 11:45 기준" 등
      buy: {
        foreign: { list: mapList(data.buy.foreign) },
        institution: { list: mapList(data.buy.institution) },
        individual: { list: mapList(data.buy.retail) } // 토스는 retail이 개인입니다.
      },
      sell: {
        foreign: { list: mapList(data.sell.foreign) },
        institution: { list: mapList(data.sell.institution) },
        individual: { list: mapList(data.sell.retail) }
      }
    };
  } catch (e) {
    console.error("❌ Toss API Fetch Error:", e.message);
    return null;
  }
};

module.exports = { 
  fetchPublicIndicator, 
  fetchNaverRankings: fetchNaverRankingsByScraping, 
  fetchNaverThemes, 
  fetchNaverThemeStocks,
  fetchInvestorTrends,
  fetchTossInvestorTrends, // 추가
  fetchNaverPrices,
  cleanNum
};
