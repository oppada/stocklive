const axios = require('axios');
const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://finance.naver.com/'
};
async function test() {
  try {
    const soxRes = await axios.get('https://finance.naver.com/world/worldDayListJson.naver?symbol=SHS@SOX&fdtc=0', { headers: NAVER_HEADERS });
    console.log("SOX:", soxRes.data[0]);
    const fxRes = await axios.get('https://polling.finance.naver.com/api/realtime?query=SERVICE_MARKETINDEX:FX_USDKRW', { headers: NAVER_HEADERS });
    console.log("FX:", fxRes.data.result.areas[0].datas[0]);
  } catch (e) { console.error(e.message); }
}
test();