import json
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def collect():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        with open('/home/ubuntu/toss_theme_list.json', 'r', encoding='utf-8') as f:
            themes = json.load(f)
            
        all_data = []
        
        # JS: 현재 페이지의 메인 종목만 추출 (그 외 회사 제외, 필터링 로직 강화)
        js_extract_main = """
        const results = [];
        // '그 외 회사' 텍스트가 포함된 요소를 찾음
        const allElements = Array.from(document.querySelectorAll('*'));
        const subSectionHeader = allElements.find(el => 
            el.children.length === 0 && el.innerText && el.innerText.includes('그 외 회사')
        );
        
        const allLinks = document.querySelectorAll('a[href*="/stocks/"]');
        allLinks.forEach(link => {
            // '그 외 회사' 섹션보다 뒤에 있는 링크는 제외
            if (subSectionHeader && (subSectionHeader.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                return;
            }
            
            const href = link.href;
            const codeMatch = href.match(/\/stocks\/(A\d{6})/);
            if (codeMatch) {
                const code = codeMatch[1].substring(1);
                const text = link.innerText.split('\\n').filter(t => t.trim().length > 0)[0];
                
                const trimmedText = text ? text.trim() : "";
                // 필터링 로직 개선: 
                // 1. 숫자로만 이루어진 경우 제외 (가격)
                // 2. '%'가 포함된 경우 제외 (등락률)
                // 3. '원'으로 끝나는 경우 제외 (가격) - 단, 종목명 자체가 '원'으로 끝날 가능성 고려
                const isPrice = trimmedText.endsWith('원') && !isNaN(trimmedText.replace(/,/g, '').replace('원', ''));
                const isPercent = trimmedText.includes('%');
                const isPureNumeric = !isNaN(trimmedText.replace(/,/g, ''));

                if (trimmedText && !isPrice && !isPercent && !isPureNumeric) {
                    results.push({name: trimmedText, code: code});
                }
            }
        });
        // 중복 제거
        const unique = Array.from(new Set(results.map(s => JSON.stringify(s)))).map(s => JSON.parse(s));
        return unique;
        """
        
        for i, theme in enumerate(themes):
            print(f"[{i+1}/{len(themes)}] '{theme['name']}' 수집 중...")
            url = f"https://www.tossinvest.com/?ranking-type=trending_category&contentType=tics&contentParams=%7B%22id%22%3A%22{theme['id']}%22%2C%22market%22%3A%22kr%22%7D"
            
            # 팝업이 확실히 로드될 때까지 최대 3번 시도
            for attempt in range(3):
                driver.get(url)
                time.sleep(5 + attempt * 2)
                if driver.find_elements(By.CSS_SELECTOR, 'a[href*="/stocks/A"]'):
                    break
            
            theme_stocks = []
            seen_codes = set()
            
            # 페이지네이션 처리
            page = 1
            while True:
                current_page_stocks = driver.execute_script(js_extract_main)
                new_added = 0
                for s in current_page_stocks:
                    if s['code'] not in seen_codes:
                        theme_stocks.append(s)
                        seen_codes.add(s['code'])
                        new_added += 1
                
                print(f"  - {page}페이지: {new_added}개 추가 (누적 {len(theme_stocks)}개)")
                
                try:
                    next_page_num = page + 1
                    pagination_buttons = driver.find_elements(By.XPATH, f"//button[text()='{next_page_num}']")
                    if pagination_buttons:
                        driver.execute_script("arguments[0].click();", pagination_buttons[0])
                        time.sleep(3)
                        page += 1
                    else:
                        break
                except:
                    break
            
            all_data.append({
                'theme_name': theme['name'],
                'stocks': theme_stocks,
                'count': len(theme_stocks)
            })
            
            # 중간 저장
            with open('/home/ubuntu/toss_stock_themes_v5.json', 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
            
        return all_data
    finally:
        driver.quit()

if __name__ == "__main__":
    data = collect()
    print("수집 완료!")
