import puppeteer from 'puppeteer';
import fs from 'fs';

async function fetchTossThemes() {
    console.log("🚀 [최종 보정] 에러를 수정하고 국내 테마만 정밀하게 수집합니다...");
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--window-size=1400,1050'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1050 });

    try {
        await page.goto('https://www.tossinvest.com/?ranking-type=trending_category', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 8000));

        // 1. 국내 테마 목록만 추출 (에러 방지 로직 추가)
        const koreaThemes = await page.evaluate(() => {
            const results = [];
            // '해외' 섹션 이전까지만 탐색하기 위해 위치 파악
            const allElements = Array.from(document.querySelectorAll('*'));
            const overseasIdx = allElements.findIndex(el => (el.textContent || "").trim() === '해외');
            const targetArea = overseasIdx !== -1 ? allElements.slice(0, overseasIdx) : allElements;

            targetArea.forEach(el => {
                // innerText가 없을 경우를 대비해 기본값 "" 설정 및 trim() 에러 방지
                const rawText = el.innerText || "";
                const lines = rawText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                
                // 순위(숫자)와 테마명이 같이 있는 구조만 선택
                if (lines.length >= 2 && /^\d+$/.test(lines[0])) {
                    const rank = parseInt(lines[0]);
                    const name = lines[1];
                    if (!results.some(r => r.name === name)) {
                        results.push({ name, rank });
                    }
                }
            });
            return results.sort((a, b) => a.rank - b.rank);
        });

        // 상위 10개 제한 (국내만 포함됨)
        const targetThemes = koreaThemes.slice(0, 10);
        console.log(`✅ 수집 대상(국내): ${targetThemes.map(t => t.name).join(', ')}`);

        const finalData = [];

        for (let i = 0; i < targetThemes.length; i++) {
            const theme = targetThemes[i];
            console.log(`📂 [${i + 1}/10] '${theme.name}' 수집 중...`);

            // 테마 클릭
            await page.evaluate((tName) => {
                const elements = Array.from(document.querySelectorAll('*'));
                // 정확히 일치하는 텍스트를 가진 요소 클릭
                const target = elements.find(el => (el.innerText || "").trim() === tName && el.offsetHeight > 0);
                if (target) {
                    target.scrollIntoView({ block: 'center' });
                    target.click();
                }
            }, theme.name);

            // 상세 창 로딩 대기
            await new Promise(r => setTimeout(r, 10000));

            // 2. 종목 추출 (국내 주식 코드 6자리 기반)
            const stocks = await page.evaluate(() => {
                const found = [];
                const links = Array.from(document.querySelectorAll('a[href*="/stocks/"]'));
                
                // '그 외 회사' 텍스트 아래는 무시
                const noiseElement = Array.from(document.querySelectorAll('*')).find(el => (el.innerText || "").includes('그 외 회사'));
                const noiseY = noiseElement ? noiseElement.getBoundingClientRect().top + window.scrollY : 999999;

                links.forEach(link => {
                    const href = link.href;
                    const codeMatch = href.match(/\/stocks\/(\d{6})/); // 국내 6자리 숫자만
                    const name = (link.innerText || "").split('\n')[0].trim();

                    if (codeMatch && name && name.length > 1 && !/^\d+$/.test(name)) {
                        const rect = link.getBoundingClientRect();
                        // 화면에 보이고 노이즈 섹션보다 위에 있는 경우만
                        if (rect.width > 0 && rect.top + window.scrollY < noiseY) {
                            if (!found.some(s => s.code === codeMatch[1])) {
                                found.push({ name, code: codeMatch[1] });
                            }
                        }
                    }
                });
                return found;
            });

            finalData.push({ 
                rank: theme.rank, 
                theme_name: theme.name, 
                stocks: stocks,
                count: stocks.length 
            });

            // 실시간 저장
            fs.writeFileSync('toss_themes.json', JSON.stringify(finalData, null, 2));
            console.log(`   ✨ ${stocks.length}개 종목 저장 완료`);

            // 페이지 새로고침으로 초기화 (가장 안전)
            await page.reload({ waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 5000));
        }

        console.log("🎉 모든 수집이 완료되었습니다.");

    } catch (err) {
        console.error("❌ 실행 중 오류 발생:", err);
    } finally {
        await browser.close();
    }
}

fetchTossThemes();