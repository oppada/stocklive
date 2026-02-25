const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TOSS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * 토스증권 내부 데이터 추출 유틸리티
 */
const extractTossInternalData = (html) => {
    try {
        const $ = cheerio.load(html);
        const jsonData = $('#__NEXT_DATA__').html();
        if (!jsonData) return null;
        const parsed = JSON.parse(jsonData);
        return parsed.props?.pageProps?.initialData || parsed.props?.pageProps || parsed;
    } catch (e) {
        return null;
    }
};

/**
 * 토스증권 테마 랭킹 수집 (파이썬 스크립트 로직 이식)
 */
const fetchTossThemes = async () => {
    try {
        console.log("📡 [Toss] 테마 데이터 추출 중...");
        const url = "https://www.tossinvest.com/?ranking-type=trending_category";
        const response = await axios.get(url, { headers: TOSS_HEADERS, timeout: 10000 });
        const html = response.data;
        const $ = cheerio.load(html);
        
        let themes = [];
        const seenIds = new Set();

        // 1. JSON 데이터에서 먼저 시도
        const internalData = extractTossInternalData(html);
        const results = internalData?.contents || internalData?.components || [];
        
        results.forEach(item => {
            const id = item.contentParams?.id || item.id;
            const name = item.title || item.name || item.label;
            if (id && name && !seenIds.has(id)) {
                themes.push({
                    id: id,
                    name: name,
                    avgChangeRate: parseFloat(String(item.description || "0").replace(/[^0-9.-]/g, '')) || 0
                });
                seenIds.add(id);
            }
        });

        // 2. 만약 JSON에서 실패하면 파이썬 로직(HTML 링크 파싱)으로 시도
        if (themes.length === 0) {
            console.log("⚠️ JSON 추출 실패. HTML 링크 기반 파싱 시도 (Python 로직)...");
            $('a[href*="contentParams"]').each((i, el) => {
                const href = $(el).attr('href') || '';
                const idMatch = href.match(/%22id%22%3A%22(\d+)%22/) || href.match(/"id":"(\d+)"/);
                
                if (idMatch) {
                    const id = idMatch[1];
                    const parts = $(el).text().split('\n').map(p => p.trim()).filter(p => p.length > 0);
                    
                    // 파이썬 로직: 순수 테마명만 찾기
                    const themeName = parts.find(p => {
                        return p.length > 1 && 
                               !/^[0-9]+$/.test(p) && 
                               !p.includes('%') && 
                               !p.includes('개 종목') &&
                               !p.includes('+') &&
                               !p.includes('-');
                    });

                    if (themeName && !seenIds.has(id)) {
                        themes.push({ id, name: themeName, avgChangeRate: 0 });
                        seenIds.add(id);
                    }
                }
            });
        }

        // 3. 최종 백업: 로컬 JSON 파일 로드
        if (themes.length < 5) {
            console.log("⚠️ 크롤링 결과 부족. 로컬 JSON 백업 로드 시도...");
            const localPath = path.join(process.cwd(), 'all', 'toss_stock_themes_local_v3.json');
            if (fs.existsSync(localPath)) {
                const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
                return localData.map(t => ({ id: t.id || '', name: t.theme_name || t.name, avgChangeRate: 0 }));
            }
        }

        console.log(`✅ [Toss] 테마 ${themes.length}개 발견.`);
        return themes;
    } catch (e) {
        console.error("❌ Toss Themes Error:", e.message);
        return [];
    }
};

/**
 * 토스증권 투자자별 순매수 수집
 */
const fetchTossInvestorRankings = async (investor = 'FOREIGNER') => {
    try {
        console.log(`📡 [Toss] ${investor} 랭킹 추출 중...`);
        const url = `https://www.tossinvest.com/?ranking-type=net_buying&investorType=${investor}`;
        const response = await axios.get(url, { headers: TOSS_HEADERS, timeout: 10000 });
        const html = response.data;
        const $ = cheerio.load(html);

        let results = [];
        
        // 1. JSON 기반 시도
        const internalData = extractTossInternalData(html);
        const components = internalData?.contents || internalData?.components || [];
        
        components.forEach(item => {
            const stock = item.stock || item.content?.stock;
            if (stock && (stock.itemCode || stock.code)) {
                results.push({
                    code: stock.itemCode || stock.code,
                    name: stock.name,
                    price: stock.price?.formattedValue || stock.formattedPrice || '0',
                    changeRate: stock.changeRate?.formattedValue || stock.formattedChangeRate || '0%',
                    tradeValue: item.description || item.subTitle || '0'
                });
            }
        });

        // 2. HTML 파싱 기반 시도 (Python 로직)
        if (results.length === 0) {
            console.log("⚠️ JSON 추출 실패. HTML 파싱 시도...");
            $('a[href*="/stocks/"]').each((i, el) => {
                const href = $(el).attr('href') || '';
                const codeMatch = href.match(/\/stocks\/(A?\d{6})/);
                if (codeMatch) {
                    const code = codeMatch[1].replace('A', '');
                    const parts = $(el).text().split('\n').map(p => p.trim()).filter(p => p.length > 0);
                    const name = parts[0];
                    const priceStr = parts.find(p => p.includes(',') || /^[0-9]+$/.test(p.replace(/,/g, '')));
                    const rateStr = parts.find(p => p.includes('%'));
                    const valueStr = parts.find(p => p.includes('억') || p.includes('만원'));

                    if (name && isNaN(name.replace(/,/g, ''))) {
                        results.push({ code, name, price: priceStr || '0', changeRate: rateStr || '0%', tradeValue: valueStr || '0' });
                    }
                }
            });
        }

        console.log(`✅ [Toss] ${investor} ${results.length}개 종목 발견.`);
        return results;
    } catch (e) {
        console.error(`❌ Toss Investor Error (${investor}):`, e.message);
        return [];
    }
};

module.exports = { fetchTossThemes, fetchTossInvestorRankings };
