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
    # chrome_options.add_argument("--headless") # 필요시 주석 해제
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def collect():
    driver = get_driver()
    print("🚀 토스증권 전종목 수집 시작 (페이지네이션 개선 버전)...")
    
    try:
        driver.get("https://www.tossinvest.com/?ranking-type=trending_category")
        wait = WebDriverWait(driver, 15)
        time.sleep(5) # 초기 로딩 대기

        # 1. 국내 테마 리스트 추출 (기존 로직 유지)
        js_get_themes = """
        const themes = [];
        const allLinks = Array.from(document.querySelectorAll('a'));
        allLinks.forEach(link => {
            const href = link.href;
            const idMatch = href.match(/%22id%22%3A%22(\\d+)%22/) || href.match(/"id":"(\\d+)"/);
            if (idMatch) {
                let name = link.innerText.split('\\n').find(part => part.trim().length > 1 && !part.includes('%'));
                const isDomestic = href.includes('market%22%3A%22kr%22') || href.includes('"market":"kr"');
                if (name && isDomestic) {
                    themes.push({id: idMatch[1], name: name.trim()});
                }
            }
        });
        return themes;
        """
        themes_raw = driver.execute_script(js_get_themes)
        themes = list({t['id']: t for t in themes_raw}.values())
        print(f"✅ 국내 테마 {len(themes)}개 감지됨.")

        all_data = []
        
        # 종목 추출 JS (기존 로직 보강)
        js_extract_stocks = """
        const results = [];
        const links = document.querySelectorAll('a[href*="/stocks/"]');
        links.forEach(link => {
            const href = link.href;
            const codeMatch = href.match(/\\/stocks\\/(A?\\d{6})/);
            if (codeMatch) {
                const code = codeMatch[1].replace('A', '');
                const name = link.innerText.split('\\n')[0].trim();
                if (name && !name.includes('%') && isNaN(name.replace(/,/g, ''))) {
                    results.push({name, code});
                }
            }
        });
        return results;
        """

        for i, theme in enumerate(themes):
            print(f"📂 [{i+1}/{len(themes)}] '{theme['name']}' 수집 중...")
            url = f"https://www.tossinvest.com/?ranking-type=trending_category&contentType=tics&contentParams=%7B%22id%22%3A%22{theme['id']}%22%2C%22market%22%3A%22kr%22%7D"
            driver.get(url)
            time.sleep(5)

            theme_stocks = []
            seen_codes = set()
            current_page = 1

            while True:
                # 현재 페이지 종목 저장
                stocks = driver.execute_script(js_extract_stocks)
                for s in stocks:
                    if s['code'] not in seen_codes:
                        theme_stocks.append(s)
                        seen_codes.add(s['code'])

                # 다음 페이지 버튼 찾기 (텍스트가 현재페이지+1 인 버튼 찾기)
                next_page_num = current_page + 1
                try:
                    # 팝업 내부의 페이지네이션 버튼을 더 정확하게 찾기 위한 XPath
                    next_btn_xpath = f"//button[contains(text(), '{next_page_num}')]"
                    next_btn = driver.find_element(By.XPATH, next_btn_xpath)
                    
                    # 버튼이 보일 때까지 스크롤 후 클릭
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", next_btn)
                    time.sleep(1)
                    driver.execute_script("arguments[0].click();", next_btn)
                    
                    print(f"  -> {next_page_num}페이지로 이동...")
                    time.sleep(3) # 페이지 로딩 대기
                    current_page += 1
                except:
                    # 다음 번호 버튼이 없으면 해당 테마 수집 종료
                    print(f"  ✨ {theme['name']} 완료 (총 {len(theme_stocks)}개)")
                    break

            all_data.append({
                'theme_name': theme['name'],
                'stocks': theme_stocks,
                'count': len(theme_stocks)
            })

            # 중간 저장 (안전장치)
            with open('toss_themes_full.json', 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)

        print("\n🎉 모든 데이터 수집 완료! 'toss_themes_full.json'을 확인하세요.")

    finally:
        driver.quit()

if __name__ == "__main__":
    collect()