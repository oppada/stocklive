const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function collectInvestorTrend() {
    console.log("🚀 [Toss JS] 투자자 동향 수집 시작...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const results = {
        "buy": { "foreign": { "list": [], "time": "" }, "institution": { "list": [], "time": "" }, "individual": { "list": [], "time": "" } },
        "sell": { "foreign": { "list": [], "time": "" }, "institution": { "list": [], "time": "" }, "individual": { "list": [], "time": "" } }
    };

    try {
        await page.goto("https://www.tossinvest.com/?ranking-type=domestic_investor_trend", { waitUntil: 'networkidle2', timeout: 60000 });
        console.log("⏳ 페이지 로딩 및 스크롤 중...");
        
        // 정밀 스크롤 (95개 확보용)
        for (let i = 0; i < 15; i++) {
            await page.evaluate((y) => window.scrollTo(0, y), i * 800);
            await new Promise(r => setTimeout(r, 600));
        }
        await new Promise(r => setTimeout(r, 2000));

        const extractData = async () => {
            return await page.evaluate(() => {
                const sections = { 
                    foreign: { list: [], time: "" }, 
                    institution: { list: [], time: "" }, 
                    individual: { list: [] , time: "" } 
                };
                const headerMap = { '외국인': 'foreign', '기관': 'institution', '개인': 'individual' };
                const allElements = Array.from(document.querySelectorAll('*'));

                Object.keys(headerMap).forEach(key => {
                    const type = headerMap[key];
                    const headerEl = allElements.find(el => el.innerText && el.innerText.trim() === key && el.children.length < 3);
                    
                    if (headerEl) {
                        // 시간 추출
                        let p = headerEl.parentElement;
                        for(let i=0; i<5; i++) {
                            if(!p) break;
                            const timeMatch = p.innerText.match(/(\d+:\d+|오늘|어제).*기준/);
                            if(timeMatch) {
                                sections[type].time = timeMatch[0];
                                break;
                            }
                            p = p.parentElement;
                        }

                        // 리스트 추출 (95개)
                        let container = headerEl.parentElement;
                        while(container && !container.querySelector('a[href*="/stocks/A"]')) {
                            container = container.nextElementSibling || container.parentElement;
                        }
                        if(container) {
                            const links = Array.from(container.querySelectorAll('a[href*="/stocks/A"]'));
                            links.forEach(a => {
                                if(sections[type].list.length >= 95) return;
                                const lines = a.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                                const codeMatch = a.href.match(/\/stocks\/A(\d{6})/);
                                const code = codeMatch ? codeMatch[1] : null;
                                if(code && !sections[type].list.some(s => s.code === code)) {
                                    const rateMatch = a.innerText.match(/[+-]?\d+\.?\d*%/);
                                    sections[type].list.push({
                                        rank: lines[0], name: lines[1], code: code,
                                        changeRate: rateMatch ? rateMatch[0] : "0%",
                                        tradeValue: lines[lines.length - 1]
                                    });
                                }
                            });
                        }
                    }
                });
                return sections;
            });
        };

        console.log("📊 순매수 데이터 수집 중...");
        results.buy = await extractData();

        console.log("🔄 순매도 탭 전환...");
        const buttons = await page.$$('button');
        let clicked = false;
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text.includes('순매도')) {
                await btn.click();
                clicked = true;
                break;
            }
        }
        if (clicked) {
            await new Promise(r => setTimeout(r, 5000));
            // 순매도 탭 스크롤
            for (let i = 0; i < 10; i++) {
                await page.evaluate((y) => window.scrollTo(0, y), i * 1000);
                await new Promise(r => setTimeout(r, 400));
            }
            results.sell = await extractData();
        } else {
            results.sell = results.buy;
        }

    } catch (e) {
        console.error("❌ Toss JS Error:", e.message);
        throw e;
    } finally {
        await browser.close();
    }

    const savePath = path.join(__dirname, 'toss_investor_data.json');
    fs.writeFileSync(savePath, JSON.stringify(results, null, 4));
    console.log("✅ [Toss JS] 수집 및 JSON 저장 완료.");
    return results;
}

if (require.main === module) {
    collectInvestorTrend().catch(console.error);
}

module.exports = collectInvestorTrend;
