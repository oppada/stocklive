const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/'
};

const cleanNum = (str) => {
  if (!str) return 0;
  return str.replace(/[^\d.-]/g, '');
};

async function testFetch() {
  const targets = [
    { name: '다우산업', symbol: 'DJI@DJI' },
    { name: '나스닥', symbol: 'NAS@IXIC' },
    { name: 'S&P500', symbol: 'SPI@SPX' },
    { name: '반도체', symbol: 'SHS@SOX' }
  ];

  for (const t of targets) {
    try {
      // 상세 페이지 직접 크롤링 테스트
      const detailUrl = `https://finance.naver.com/world/sise.naver?symbol=${t.symbol}`;
      const res = await axios.get(detailUrl, { headers: NAVER_HEADERS, responseType: 'arraybuffer', timeout: 10000 });
      const h = iconv.decode(res.data, 'euc-kr');
      const $ = cheerio.load(h);
      
      const price = $('#last_rate').text();
      const change = $('#rate_diff').text();
      const rate = $('#rate_fluctuation').text();
      
      console.log(`[${t.name}] Price: ${price}, Change: ${change}, Rate: ${rate}`);
    } catch (e) {
      console.log(`[${t.name}] Error: ${e.message}`);
    }
  }
}

testFetch();
