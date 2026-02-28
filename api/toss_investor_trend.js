const fs = require('fs');
const path = require('path');

async function collectInvestorTrend() {
    console.log("🚀 [Toss JS] 투자자 동향 수집 시작...");
    
    const isVercel = process.env.VERCEL;
    let browser;

    try {
        if (isVercel) {
            // Vercel(서버) 환경용 설정
            const chromium = require('@sparticuz/chromium');
            const puppeteer = require('puppeteer-core');
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } else {
            // 로컬(내 컴퓨터) 환경용 설정
            const puppeteer = require('puppeteer');
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-dev-shm-usage']
            });
        }

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const results = {
            "buy": { "foreign": { "list": [], "time": "" }, "institution": { "list": [], "time": "" }, "individual": { "list": [], "time": "" } },
            "sell": { "foreign": { "list": [], "time": "" }, "institution": { "list": [], "time": "" }, "individual": { "list": [], "time": "" } }
        };

        await page.goto("https://www.tossinvest.com/?ranking-type=domestic_investor_trend", { waitUntil: 'networkidle2', timeout: 60000 });
        
        // 정밀 스크롤
        for (let i = 0; i < 12; i++) {
            await page.evaluate((y) => window.scrollTo(0, y), i * 800);
            await new Promise(r => setTimeout(r, 500));
        }

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
                        let p = headerEl.parentElement;
                        for(let i=0; i<5; i++) {
                            if(!p) break;
                            const timeMatch = p.innerText.match(/((\d+월\s+\d+일)|오늘|어제|\d+:\d+).*기준/);
                            if(timeMatch) {
                                sections[type].time = timeMatch[0];
                                break;
                            }
                            p = p.parentElement;
                        }
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

        results.buy = await extractData();

        // 순매도 전환
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text.includes('순매도')) {
                await btn.click();
                await new Promise(r => setTimeout(r, 4000));
                break;
            }
        }
        results.sell = await extractData();

        await browser.close();
        
        const savePath = path.join(__dirname, 'toss_investor_data.json');
        fs.writeFileSync(savePath, JSON.stringify(results, null, 4));
        return results;

    } catch (e) {
        if (browser) await browser.close();
        console.error("❌ Toss JS Error:", e.message);
        throw e;
    }
}

if (require.main === module) {
    collectInvestorTrend().catch(console.error);
}

module.exports = collectInvestorTrend;
