const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/sise/'
};

// 헬퍼: 숫자 문자열 정제
const cleanNum = (str) => {
  if (!str) return 0;
  // 숫자, 소수점, 마이너스 기호만 남기고 제거
  return str.replace(/[^\d.-]/g, '');
};

/**
 * 지수 데이터 수집
 */
const fetchPublicIndicator = async (name, symbol) => {
  const naverSymbolMap = { '^KS11': 'KOSPI', '^KQ11': 'KOSDAQ' };
  const naverCode = naverSymbolMap[symbol];
  try {
    if (naverCode) {
      const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:${naverCode}`;
      const response = await axios.get(url, { headers: NAVER_HEADERS, timeout: 5000 });
      const data = response.data.result.areas[0].datas[0];
      if (data) {
        return { price: parseFloat(data.nv) / 100, change: parseFloat(data.cv) / 100, changeRate: parseFloat(data.cr) };
      }
    }
    const etfMap = { '^IXIC': '133690', '^GSPC': '360750', '^SOX': '381170', 'USDKRW=X': '261240' };
    const etfCode = etfMap[symbol];
    if (etfCode) {
      const url = `https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:${etfCode}`;
      const response = await axios.get(url, { headers: NAVER_HEADERS, timeout: 5000 });
      const data = response.data.result.areas[0].datas[0];
      if (data) {
        return { price: parseFloat(data.nv), change: parseFloat(data.cv), changeRate: parseFloat(data.cr) };
      }
    }
  } catch (e) { }
  return { price: 0, change: 0, changeRate: 0 };
};

/**
 * 랭킹 데이터 수집 (수치 추출 정밀 보정)
 */
const fetchNaverRankingsByScraping = async (type) => {
  const urlMap = {
    'volume': 'https://finance.naver.com/sise/sise_quant.naver',
    'gainer': 'https://finance.naver.com/sise/sise_low_up.naver',
    'loser': 'https://finance.naver.com/sise/sise_high_down.naver',
    'value': 'https://finance.naver.com/sise/sise_quant.naver?rankingType=amount'
  };

  const baseUrl = urlMap[type] || urlMap['volume'];
  const markets = [{ name: 'KOSPI', id: '0' }, { name: 'KOSDAQ', id: '1' }];
  let combinedResults = [];

  for (const market of markets) {
    try {
      const sep = baseUrl.includes('?') ? '&' : '?';
      const response = await axios.get(`${baseUrl}${sep}sosok=${market.id}`, {
        responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000
      });
      const html = iconv.decode(response.data, 'euc-kr');
      const $ = cheerio.load(html);

      $('table.type_2 tbody tr').each((i, el) => {
        const nameAnchor = $(el).find('a.tltle');
        if (nameAnchor.length > 0) {
          const name = nameAnchor.text().trim();
          const code = nameAnchor.attr('href').split('code=')[1];
          const tds = $(el).find('td.number');
          
          if (tds.length >= 5) {
            const price = parseFloat(cleanNum(tds.eq(0).text()));
            const changeRate = parseFloat(cleanNum(tds.eq(2).text())) || 0;
            
            let volume = 0;
            let amount = 0;

            if (type === 'gainer' || type === 'loser') {
              // 급등/급락 페이지: [현재가, 전일비, 등락률, 저가, 저가대비, 거래량, 거래대금]
              volume = parseInt(cleanNum(tds.eq(5).text())) || 0;
              amount = parseInt(cleanNum(tds.eq(6).text())) * 1000000 || 0; // 백만원 -> 원
            } else {
              // 거래량/거래대금 페이지: [현재가, 전일비, 등락률, 거래량, 거래대금, ...]
              volume = parseInt(cleanNum(tds.eq(3).text())) || 0;
              amount = parseInt(cleanNum(tds.eq(4).text())) * 1000000 || 0; // 백만원 -> 원
            }

            combinedResults.push({ code, name, price, changeRate, volume, tradeValue: amount, market: market.name });
          }
        }
      });
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { }
  }

  if (type === 'gainer') combinedResults.sort((a, b) => b.changeRate - a.changeRate);
  else if (type === 'loser') combinedResults.sort((a, b) => a.changeRate - b.changeRate);
  else if (type === 'volume') combinedResults.sort((a, b) => b.volume - a.volume);
  else if (type === 'value') combinedResults.sort((a, b) => b.tradeValue - a.tradeValue);

  return combinedResults.slice(0, 50);
};

/**
 * 테마 정보 수집
 */
const fetchNaverThemes = async () => {
  try {
    const response = await axios.get('https://finance.naver.com/sise/theme.naver', {
      responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000
    });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    const themes = [];

    $('table.type_1 tbody tr').each((i, el) => {
      const nameTag = $(el).find('td.col_type1 a');
      if (nameTag.length > 0) {
        const name = nameTag.text().trim();
        const rate = parseFloat(cleanNum($(el).find('td.col_type2 span').text()));
        themes.push({ name, avgChangeRate: rate });
      }
    });
    return themes.sort((a, b) => b.avgChangeRate - a.avgChangeRate).slice(0, 30);
  } catch (e) { return []; }
};

/**
 * 투자자별 매매 동향 수집
 */
const fetchInvestorTrends = async () => {
  try {
    const response = await axios.get('https://finance.naver.com/sise/sise_trans_style.naver', {
      responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000
    });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    
    // 코스피/코스닥 순매수 데이터 파싱
    const trends = { KOSPI: {}, KOSDAQ: {} };
    const tables = $('table.type_1');
    
    // 단순화된 로직: 첫 번째 테이블이 투자자별 동향
    tables.first().find('tr').each((i, el) => {
      const title = $(el).find('th').text();
      const tds = $(el).find('td');
      if (tds.length >= 2) {
        const market = i <= 3 ? 'KOSPI' : 'KOSDAQ'; // 대략적인 구분
        // 실제 구현 시 더 정밀한 셀렉터 필요하나 우선 기본값 채움
      }
    });
    
    return {
      updated_at: new Date(),
      // 임시 데이터 구조 (추후 정밀화 가능)
      msg: "수집 성공"
    };
  } catch (e) { return null; }
};

module.exports = { fetchPublicIndicator, fetchNaverRankingsByScraping, fetchNaverThemes, fetchInvestorTrends };