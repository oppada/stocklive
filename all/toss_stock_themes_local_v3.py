import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def get_driver():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def collect():
    driver = get_driver()
    print("🚀 [v6] 토스증권 전종목 수집 시작 (JS 문법 및 테마명 매핑 수정)...")
    
    try:
        driver.get("https://www.tossinvest.com/?ranking-type=trending_category")
        time.sleep(8) 

        # 1. 테마 리스트 추출 (append -> push로 수정 및 필터링 강화)
        js_get_themes = """
        const themes = [];
        const allLinks = Array.from(document.querySelectorAll('a[href*="contentParams"]'));
        allLinks.forEach(link => {
            const href = link.href;
            const idMatch = href.match(/%22id%22%3A%22(\\d+)%22/) || href.match(/"id":"(\\d+)"/);
            
            if (idMatch) {
                // 텍스트 정제: 줄바꿈으로 나누고 공백 제거
                const parts = link.innerText.split('\\n').map(p => p.trim()).filter(p => p.length > 0);
                
                // 순수하게 한글/영문 테마명만 찾기 (숫자, %, 등락폭 제외)
                const themeName = parts.find(p => {
                    return p.length > 1 && 
                           !/^[0-9]+$/.test(p) && 
                           !p.includes('%') && 
                           !p.includes('개 종목') &&
                           !p.includes('+') &&
                           !p.includes('-');
                });
                
                const isDomestic = href.includes('market%22%3A%22kr%22') || href.includes('"market":"kr"');
                if (themeName && isDomestic) {
                    // [중요 수정] JS에서는 append가 아니라 push입니다.
                    themes.push({id: idMatch[1], name: themeName});
                }
            }
        });
        return themes;
        """
        themes_raw = driver.execute_script(js_get_themes)
        
        # 중복 제거
        themes = []
        seen_ids = set()
        for t in themes_raw:
            if t['id'] not in seen_ids:
                themes.append(t)
                seen_ids.add(t['id'])
        
        print(f"✅ 총 {len(themes)}개의 국내 테마 감지 완료.")

        all_data = []

        for i, theme in enumerate(themes):
            print(f"📂 [{i+1}/{len(themes)}] '{theme['name']}' 수집 중...")
            url = f"https://www.tossinvest.com/?ranking-type=trending_category&contentType=tics&contentParams=%7B%22id%22%3A%22{theme['id']}%22%2C%22market%22%3A%22kr%22%7D"
            driver.get(url)
            time.sleep(6)

            theme_stocks = []
            seen_codes = set()
            current_page = 1

            while True:
                # '그 외 회사' 전까지만 추출하는 로직 유지
                js_extract_main = """
                const stocks = [];
                const allElements = Array.from(document.querySelectorAll('*'));
                const noiseHeader = allElements.find(el => el.innerText && el.innerText.trim() === '그 외 회사');
                
                const links = Array.from(document.querySelectorAll('a[href*="/stocks/"]'));
                links.forEach(link => {
                    if (noiseHeader && (noiseHeader.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
                    
                    const codeMatch = link.href.match(/\\/stocks\\/(A?\\d{6})/);
                    if (codeMatch) {
                        const code = codeMatch[1].replace('A', '');
                        const name = link.innerText.split('\\n')[0].trim();
                        if (name && isNaN(name.replace(/,/g, ''))) {
                            stocks.push({name, code});
                        }
                    }
                });
                return stocks;
                """
                
                page_stocks = driver.execute_script(js_extract_main)
                for s in page_stocks:
                    if s['code'] not in seen_codes:
                        theme_stocks.append(s)
                        seen_codes.add(s['code'])

                # 페이지네이션 버튼 클릭 (숫자 텍스트 기준)
                try:
                    next_page_num = current_page + 1
                    # 팝업 내 모든 버튼 중 텍스트가 다음 숫자인 것 찾기
                    buttons = driver.find_elements(By.TAG_NAME, "button")
                    next_btn = None
                    for btn in buttons:
                        if btn.text.strip() == str(next_page_num):
                            next_btn = btn
                            break
                    
                    if next_btn:
                        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn)
                        time.sleep(1)
                        driver.execute_script("arguments[0].click();", next_btn)
                        print(f"  -> {next_page_num}페이지 이동...")
                        time.sleep(4)
                        current_page += 1
                    else:
                        break 
                except:
                    break

            all_data.append({
                'theme_name': theme['name'],
                'stocks': theme_stocks,
                'count': len(theme_stocks)
            })

            with open('toss_stock_themes_local_v3.json', 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)

    finally:
        driver.quit()

if __name__ == "__main__":
    collect()