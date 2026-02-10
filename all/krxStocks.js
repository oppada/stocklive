import axios from "axios";
import fs from "fs";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

const URL = "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download";

async function run() {
  try {
    console.log("🚀 KRX 종목 데이터 수집 시작...");
    
    const res = await axios.get(URL, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const decoded = iconv.decode(res.data, "euc-kr");
    const $ = cheerio.load(decoded);
    const stocks = []; // 배열 선언

    $("table tr").each((i, el) => {
      if (i === 0) return;

      const tds = $(el).find("td");
      const name = $(tds[0]).text().trim();
      const market = $(tds[1]).text().trim();
      const code = $(tds[2]).text().trim();

      if (/^\d{6}$/.test(code)) {
        // [수정] append를 push로 변경
        stocks.push({
          code: code,
          name: name,
          market: market.includes("유가") ? "KOSPI" : market.includes("코스닥") ? "KOSDAQ" : "KONEX",
        });
      }
    });

    fs.writeFileSync(
      "krx_stocks.json",
      JSON.stringify(stocks, null, 2),
      "utf-8"
    );

    console.log(`✅ 수집 완료! 총 ${stocks.length}개의 종목이 정제되었습니다.`);
    
  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  }
}

run();