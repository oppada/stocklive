import axios from "axios";
import fs from "fs";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

async function getMarketStocks(marketCode) {
    const stocks = [];
    const marketName = marketCode === 0 ? "KOSPI" : "KOSDAQ";
    
    // 보통 코스피는 40페이지, 코스닥은 40~50페이지 정도면 전 종목 수집 가능합니다.
    for (let page = 1; page <= 60; page++) {
        const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=${marketCode}&page=${page}`;
        
        try {
            const res = await axios.get(url, { 
                responseType: "arraybuffer",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            });
            const html = iconv.decode(res.data, "euc-kr");
            const $ = cheerio.load(html);

            const rows = $("table.type_2 tbody tr");
            let addedInPage = 0;

            rows.each((i, el) => {
                const nameAnchor = $(el).find("a.tltle");
                if (nameAnchor.length > 0) {
                    const name = nameAnchor.text().trim();
                    const link = nameAnchor.attr("href");
                    const code = link.split("code=")[1];
                    
                    stocks.push({ code, name, market: marketName });
                    addedInPage++;
                }
            });

            if (addedInPage === 0) break; // 더 이상 데이터가 없으면 다음 시장으로
            console.log(`📡 ${marketName}: ${page}페이지 수집 완료 (${addedInPage}개)`);
            
            // 서버 부하 방지를 위한 아주 짧은 휴식
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (err) {
            console.error(`❌ ${page}페이지 수집 중 에러:`, err.message);
            break;
        }
    }
    return stocks;
}

async function run() {
    try {
        console.log("🚀 [StockNowit] 네이버 금융 채널을 통해 우선주 포함 데이터 수집을 시작합니다...");
        
        const kospi = await getMarketStocks(0);  // 코스피
        const kosdaq = await getMarketStocks(1); // 코스닥
        
        const allStocks = [...kospi, ...kosdaq];
        
        // 종목코드 기준 중복 제거 및 이름순 정렬
        const uniqueStocks = Array.from(new Map(allStocks.map(s => [s.code, s])).values());
        uniqueStocks.sort((a, b) => a.name.localeCompare(b.name));

        fs.writeFileSync("krx_stocks.json", JSON.stringify(uniqueStocks, null, 2), "utf-8");

        console.log("---");
        console.log(`✅ 최종 수집 완료! 총 ${uniqueStocks.length}개 종목이 krx_stocks.json에 저장되었습니다.`);
        
        // 삼성전자우 포함 여부 최종 확인
        const check = uniqueStocks.find(s => s.name === "삼성전자우");
        if (check) {
            console.log(`✨ 드디어 성공! '삼성전자우'(${check.code})가 포함되었습니다.`);
        } else {
            console.log("⚠️ 리스트를 확인해 주세요. 삼성전자우가 보이지 않습니다.");
        }
    } catch (error) {
        console.error("❌ 치명적 에러 발생:", error.message);
    }
}

run();