import json
import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def get_driver():
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # 필요시 주석 해제
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def collect():
    driver = get_driver()
    print("🚀 토스증권 데이터 수집을 시작합니다 (v3 - 페이지네이션 강화)...")
    
    try:
        # 1. 테마 리스트 수집
        print("📋 테마 리스트 페이지 접속 중...")
        driver.get("https://www.tossinvest.com/?ranking-type=trending_category")
        
        wait = WebDriverWait(driver, 15)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="contentParams"]')))
        except:
            pass

        js_get_themes = """
        const themes = [];
        const allLinks = Array.from(document.querySelectorAll('a'));
        allLinks.forEach(link => {
            const href = link.href;
            const idMatch = href.match(/%22id%22%3A%22(\\d+)%22/) || href.match(/"id":"(\\d+)"/);
            if (idMatch) {
                let name = "";
                const textParts = link.innerText.split('\\n');
                for (let part of textParts) {
                    const cleaned = part.replace(/[\\d%\\+\\-\\.]/g, '').trim();
                    if (cleaned.length > 1 && !cleaned.includes('종목 상승')) {
                        name = cleaned;
                        break;
                    }
                }
                const isDomestic = href.includes('market%22%3A%22kr%22') || href.includes('"market":"kr"');
                if (name && isDomestic) {
                    themes.push({id: idMatch[1], name: name});
                }
            }
        });
        return themes;
        """
        
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        themes_raw = driver.execute_script(js_get_themes)
        themes = list({t['id']: t for t in themes_raw}.values())
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
            time.sleep(5)
            
            theme_stocks = []
            seen_codes = set()
            page = 1
            
            while True:
                # 현재 페이지 종목 추출
                current_page_stocks = driver.execute_script(js_extract_main)
                new_added_in_this_page = 0
                for s in current_page_stocks:
                    if s['code'] not in seen_codes:
                        theme_stocks.append(s)
                        seen_codes.add(s['code'])
                        new_added_in_this_page += 1
                
                print(f"  - {page}페이지 수집 완료 ({new_added_in_this_page}개 추가, 누적 {len(theme_stocks)}개)")
                
                # 다음 페이지 버튼 찾기 및 클릭
                try:
                    next_page_num = page + 1
                    # 팝업 내부에서 버튼을 찾기 위해 팝업 요소를 먼저 확인하거나 전체에서 버튼 텍스트로 찾음
                    # 토스 팝업 내의 페이지네이션 버튼은 보통 숫자로 되어 있음
                    xpath = f"//button[text()='{next_page_num}']"
                    
                    # 버튼이 보일 때까지 대기 및 스크롤
                    btn = WebDriverWait(driver, 3).until(EC.presence_of_element_located((By.XPATH, xpath)))
                    
                    # 버튼이 화면에 보이도록 스크롤 (팝업 내부일 수 있으므로 JS 사용)
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
                    time.sleep(1)
                    
                    # 클릭 시도
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(3) # 페이지 전환 대기
                    page += 1
                except:
                    # 다음 페이지 버튼이 없으면 종료
                    break
            
            all_data.append({
                'theme_name': theme['name'],
                'stocks': theme_stocks,
                'count': len(theme_stocks)
            })
            
            with open('toss_stock_themes_local_v3.json', 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n✨ 모든 수집이 완료되었습니다! 'toss_stock_themes_local_v3.json' 파일을 확인하세요.")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    collect()
