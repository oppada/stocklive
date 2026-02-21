const axios = require('axios');

async function testNaver() {
  console.log("RE-TRY NAVER FINANCE");
  
  try {
    // 1. 국내 지수 테스트
    console.log("\n[DOMESTIC INDEX]");
    const domRes = await axios.get('https://polling.finance.naver.com/api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ');
    const domData = domRes.data.result.areas[0].datas;
    domData.forEach(d => {
      console.log(`${d.nm}: ${d.nv} (${d.cr}%)`);
    });

    // 2. 해외 지수 테스트
    console.log("\n[WORLD INDEX]");
    const worldRes = await axios.get('https://polling.finance.naver.com/api/realtime/world/item/NAS@IXIC,SPI@SPX,SHS@SOX');
    const worldData = worldRes.data.result.items;
    worldData.forEach(w => {
      console.log(`${w.nm}: ${w.nv} (${w.cr}%)`);
    });

  } catch (e) {
    console.error("ERR:", e.message);
  }
}

testNaver();