import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

def get_driver():
    chrome_options = Options()
    # 화면 없이 실행하려면 아래 주석을 해제하세요
    # chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def collect():
    driver = get_driver()
    print("🚀 토스증권 데이터 수집을 시작합니다...")
    
    try:
        # 1. 테마 리스트 먼저 수집
        print("📋 테마 리스트를 불러오는 중...")
        driver.get("https://www.tossinvest.com/?ranking-type=trending_category")
        time.sleep(5)
        
        # '지금 뜨는 카테고리' 탭 클릭 (필요한 경우)
        try:
            tab = driver.find_element(By.XPATH, "//button[contains(text(), '지금 뜨는 카테고리')]")
            driver.execute_script("arguments[0].click();", tab)
            time.sleep(2)
        except:
            pass

        # 국내 테마 리스트 추출
        js_get_themes = """
        const themes = [];
        const links = document.querySelectorAll('a[href*="contentParams"]');
        links.forEach(link => {
            const href = link.href;
            const match = href.match(/%22id%22%3A%22(\\d+)%22/);
            const nameEl = link.querySelector('span') || link;
            const name = nameEl.innerText.split('\\n')[0].replace(/\\d+/g, '').trim();
            if (match && name && !href.includes('market%22%3A%22us%22')) {
                themes.push({id: match[1], name: name});
            }
        });
        return themes;
        """
        themes = driver.execute_script(js_get_themes)
        # 중복 제거
        themes = list({t['id']: t for t in themes}.values())
        print(f"✅ 총 {len(themes)}개의 국내 테마를 찾았습니다.")

        # 2. 각 테마별 종목 수집
        all_data = []
        js_extract_main = r"""
        const results = [];
        const allElements = Array.from(document.querySelectorAll('*'));
        const subSectionHeader = allElements.find(el => 
            el.children.length === 0 && el.innerText && el.innerText.includes('그 외 회사')
        );
        
        const allLinks = document.querySelectorAll('a[href*="/stocks/"]');
        allLinks.forEach(link => {
            if (subSectionHeader && (subSectionHeader.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                return;
            }
            
            const href = link.href;
            const codeMatch = href.match(/\/stocks\/(A\d{6})/);
            if (codeMatch) {
                const code = codeMatch[1].substring(1);
                const text = link.innerText.split('\n').filter(t => t.trim().length > 0)[0];
                
                const trimmedText = text ? text.trim() : "";
                const isPrice = trimmedText.endsWith('원') && !isNaN(trimmedText.replace(/,/g, '').replace('원', ''));
                const isPercent = trimmedText.includes('%');
                const isPureNumeric = !isNaN(trimmedText.replace(/,/g, ''));

                if (trimmedText && !isPrice && !isPercent && !isPureNumeric) {
                    results.push({name: trimmedText, code: code});
                }
            }
        });
        return Array.from(new Set(results.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));
        """
        
        for i, theme in enumerate(themes):
            print(f"[{i+1}/{len(themes)}] '{theme['name']}' 수집 중...")
            url = f"https://www.tossinvest.com/?ranking-type=trending_category&contentType=tics&contentParams=%7B%22id%22%3A%22{theme['id']}%22%2C%22market%22%3A%22kr%22%7D"
            
            driver.get(url)
            time.sleep(4)
            
            theme_stocks = []
            seen_codes = set()
            page = 1
            
            while True:
                current_page_stocks = driver.execute_script(js_extract_main)
                new_added = 0
                for s in current_page_stocks:
                    if s['code'] not in seen_codes:
                        theme_stocks.append(s)
                        seen_codes.add(s['code'])
                        new_added += 1
                
                # 다음 페이지 확인
                try:
                    next_page_num = page + 1
                    btn = driver.find_element(By.XPATH, f"//button[text()='{next_page_num}']")
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(2)
                    page += 1
                except:
                    break
            
            print(f"  - 완료: {len(theme_stocks)}개 종목")
            all_data.append({
                'theme_name': theme['name'],
                'stocks': theme_stocks,
                'count': len(theme_stocks)
            })
            
            # 실시간 저장 (현재 폴더에 저장)
            with open('toss_stock_themes_local.json', 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n✨ 모든 수집이 완료되었습니다! 'toss_stock_themes_local.json' 파일을 확인하세요.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    collect()
