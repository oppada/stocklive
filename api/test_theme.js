const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/'
};

async function testThemeStocks() {
  const themeNo = '28'; // CCTV & DVR
  console.log(`🔍 Testing Theme Stocks for no: ${themeNo}`);
  try {
    const url = `https://finance.naver.com/sise/sise_group_detail.naver?type=theme&no=${themeNo}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000
    });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    
    // 테이블 존재 확인
    console.log("Tables found:", $('table').length);
    
    const stocks = [];
    // 네이버 테마 상세 페이지는 보통 'table.type_5'를 사용함
    $('table tr').each((i, el) => {
      const nameAnchor = $(el).find('a.tltle');
      if (nameAnchor.length > 0) {
        const name = nameAnchor.text().trim();
        const code = nameAnchor.attr('href').split('code=')[1];
        console.log(`Found Stock: ${name} (${code})`);
        stocks.push({ name, code });
      }
    });
    
    console.log(`Total stocks found: ${stocks.length}`);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testThemeStocks();
