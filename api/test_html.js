const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/'
};

async function testHTML() {
  const themeNo = '28';
  try {
    const url = `https://finance.naver.com/sise/sise_group_detail.naver?type=theme&no=${themeNo}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer', headers: NAVER_HEADERS, timeout: 10000
    });
    const html = iconv.decode(response.data, 'euc-kr');
    const $ = cheerio.load(html);
    
    console.log("--- TR Text Content (First 10 lines) ---");
    $('tr').slice(0, 20).each((i, el) => {
      console.log(`Row ${i}:`, $(el).text().replace(/\s+/g, ' ').trim().substring(0, 100));
    });
  } catch (e) { console.error(e.message); }
}
testHTML();
