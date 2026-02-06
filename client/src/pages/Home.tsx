import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { ChevronDown, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorCategory from '../components/InvestorCategory'; // Import the new component

interface StockData {
  price: number;
  change: string; // Percentage string, e.g., "1.23"
  status: 'up' | 'down' | 'flat';
  tradeVolume: string;
  tradeValue: string;
}

interface ThemeStock {
  name: string;
  code: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  stocks: ThemeStock[]; // Use ThemeStock for stocks in theme
  averageChange?: number;
}

const Home = ({ stockPrices = {}, favoritedStocks, onFavoriteToggle, showLoginMessage }: {
  stockPrices?: Record<string, StockData>;
  favoritedStocks: string[];
  onFavoriteToggle: (stockCode: string) => void;
  showLoginMessage: boolean;
}) => {
  const [activeTab, setActiveTab] = useState('급상승');
  const [investorTab, setInvestorTab] = useState('순매수'); // Add state for investor tab
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allThemes, setAllThemes] = useState<Theme[]>([]);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/toss_real_150_themes.json');
        const data = await response.json();
        const formattedThemes: Theme[] = data.themes.map((theme: any, index: number) => ({
          id: String(index + 1),
          name: theme.theme_name,
          description: theme.theme_name,
          stocks: theme.stocks.map((stock: any) => ({ name: stock.name, code: stock.code }))
        }));
        setAllThemes(formattedThemes);
      } catch (error) {
        console.error("Failed to fetch themes:", error);
      }
    };

    fetchThemes();
  }, []); // Runs once on component mount

  // Calculate average change for each theme and sort
  const allThemesWithAvgChange: Theme[] = allThemes.map(theme => {
    const changes = theme.stocks
      .map(stock => parseFloat(stockPrices[stock.code]?.change || '0'))
      .filter(change => !isNaN(change));

    const averageChange = changes.length > 0
      ? (changes.reduce((sum, current) => sum + current, 0) / changes.length)
      : 0;

    return { ...theme, averageChange: parseFloat(averageChange.toFixed(2)) };
  }).sort((a, b) => (b.averageChange || 0) - (a.averageChange || 0));

  // Set initial selectedThemeId for the '테마' tab on first load or when themes are fetched
  useEffect(() => {
    if (activeTab === '테마' && allThemesWithAvgChange.length > 0 && !selectedThemeId) {
      setSelectedThemeId(allThemesWithAvgChange[0].id);
    }
  }, [allThemesWithAvgChange, activeTab, selectedThemeId]);

  const currentTheme = allThemesWithAvgChange.find(t => t.id === selectedThemeId);




  // Combine ThemeStock with StockData for display
  const displayStocksWithData = currentTheme?.stocks.map(stock => {
    const liveData = stockPrices[stock.code];
    return {
      name: stock.name,
      code: stock.code,
      price: liveData?.price || 0, // Default to 0
      change: liveData?.change || '0', // Default to '0'
      status: liveData?.status || 'flat', // Default to 'flat'
      tradeVolume: liveData?.tradeVolume || '0', // Default to '0'
      tradeValue: liveData?.tradeValue || '0', // Default to '0'
      chart: [{v:10},{v:15},{v:20},{v:18},{v:25}] // Mock chart data or handle dynamically
    };
  }) || [];


  const mockCategoryData: Record<string, any[]> = { // Updated interface to any[] to avoid strict type checking on other categories for now
    '급상승': [
      { name: 'NAVER', code: '035420', price: 200000, change: '10.5', status: 'up', tradeVolume: '100,000', tradeValue: '5.0조', chart: [{v:10},{v:15},{v:20},{v:18},{v:25}] },
      { name: '카카오', code: '035720', price: 50000, change: '8.2', status: 'up', tradeVolume: '200,000', tradeValue: '2.0조', chart: [{v:25},{v:20},{v:18},{v:20},{v:22}] },
    ],
    '급하락': [
      { name: 'LG화학', code: '051910', price: 400000, change: '7.1', status: 'down', tradeVolume: '50,000', tradeValue: '3.5조', chart: [{v:20},{v:25},{v:18},{v:15},{v:10}] },
      { name: 'SK이노베이션', code: '096770', price: 150000, change: '5.3', status: 'down', tradeVolume: '80,000', tradeValue: '1.8조', chart: [{v:15},{v:17},{v:16},{v:18},{v:12}] },
    ],
    '거래량': [
      { name: '삼성전자우', code: '005935', price: 65000, change: '1.2', status: 'up', tradeVolume: '1,500,000', tradeValue: '10.0조', chart: [{v:18},{v:20},{v:22},{v:20},{v:24}] },
      { name: '현대차2우B', code: '005387', price: 120000, change: '0.8', status: 'up', tradeVolume: '1,000,000', tradeValue: '8.0조', chart: [{v:22},{v:20},{v:24},{v:23},{v:25}] },
    ],
    '거래대금': [
      { name: '셀트리온', code: '068270', price: 180000, change: '3.5', status: 'up', tradeVolume: '70,000', tradeValue: '7.0조', chart: [{v:12},{v:15},{v:17},{v:16},{v:19}] },
      { name: 'POSCO홀딩스', code: '005490', price: 450000, change: '2.1', status: 'up', tradeVolume: '60,000', tradeValue: '6.5조', chart: [{v:10},{v:12},{v:14},{v:13},{v:16}] },
    ],
  };

  let displayStocks: any[] = [];
  if (activeTab === '테마') {
    displayStocks = displayStocksWithData;
  } else if (activeTab === '투자자별') {
    // Placeholder for investor data
    displayStocks = [];
  } else {
    displayStocks = mockCategoryData[activeTab] || [];
  }

  const formatTradeValueInEok = (tradeValue: string | number): string => {
    const numericValue = typeof tradeValue === 'string' ? parseFloat(tradeValue) : tradeValue;

    if (isNaN(numericValue) || numericValue === 0) {
      return '0';
    }

    if (numericValue >= 1000000000000) { // 1조 이상
      return `${(numericValue / 1000000000000).toFixed(1)}조`;
    } else if (numericValue >= 100000000) { // 1억 이상
      return `${(numericValue / 100000000).toFixed(0)}억`;
    } else if (numericValue >= 10000) { // 1만 이상
      return `${(numericValue / 10000).toFixed(0)}만`;
    } else {
      return numericValue.toLocaleString();
    }
  };

  const formatTradeVolume = (volume: string | number): string => {
    const numericVolume = typeof volume === 'string' ? parseFloat(volume) : volume;

    if (isNaN(numericVolume) || numericVolume === 0) {
      return '0주';
    }

    if (numericVolume >= 100000000) { // 억 단위
      return `${(numericVolume / 100000000).toFixed(1)}억주`;
    } else if (numericVolume >= 10000) { // 만 단위
      return `${(numericVolume / 10000).toFixed(0)}만주`;
    } else {
      return `${numericVolume.toLocaleString()}주`;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0E1013] text-white overflow-y-auto">
      
      {/* [상단 영역 1] 사라졌던 카테고리 메뉴 복구 */}
      <div className="sticky top-0 z-20 w-full bg-[#0E1013] border-b border-white/5 shrink-0">
        <nav className="flex items-center gap-1 px-4 py-2 hide-scrollbar overflow-x-auto">
          {['급상승', '급하락', '거래량', '거래대금', '테마', '투자자별'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                // '테마' 탭을 클릭하면, 아직 선택된 테마가 없거나 탭이 변경될 때 첫 번째 테마를 기본으로 선택
                if (tab === '테마' && allThemesWithAvgChange.length > 0 && !selectedThemeId) {
                  setSelectedThemeId(allThemesWithAvgChange[0].id);
                }
              }}
              className={`px-2 py-1 sm:px-4 sm:py-1.5 rounded-xl text-xs sm:text-[14px] font-bold transition-all whitespace-nowrap
                ${activeTab === tab ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Conditionally render investor tabs */}
      {activeTab === '투자자별' && (
        <div className="w-full bg-[#0E1013] border-b border-white/5 px-4 pt-2 pb-2">
          <div className="flex items-center gap-2">
            {['순매수', '순매도'].map(tab => (
              <button
                key={tab}
                onClick={() => setInvestorTab(tab)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors sm:px-4 sm:py-1.5 sm:text-sm ${
                  investorTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-black/20 text-slate-400 hover:bg-black/30'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* [모바일용] 테마 목록 드롭다운 */}
      {activeTab === '테마' && (
        <div className="md:hidden w-full bg-[#0E1013] border-b border-white/5 px-4 pt-2 pb-2 relative z-10"> {/* Added z-10 for dropdown stacking */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full text-left px-4 py-2 rounded-lg bg-black/20 text-white font-bold flex justify-between items-center transition-colors hover:bg-black/30"
          >
            <span className="text-sm">{currentTheme ? currentTheme.name : '테마 선택'}</span>
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isDropdownOpen && (
            <div className="absolute left-4 right-4 mt-2 bg-[#0E1013] border border-white/10 rounded-lg shadow-lg"> {/* Adjusted background and border for dropdown */}
              <div className="h-[360px] overflow-y-auto hide-scrollbar p-2">
                {allThemesWithAvgChange.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => {
                      setSelectedThemeId(theme.id);
                      setIsDropdownOpen(false); // Close dropdown on selection
                    }}
                    className={`cursor-pointer px-4 py-1 rounded-lg transition-all duration-200 mb-1 group
                      ${selectedThemeId === theme.id ? 'bg-blue-600/20' : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className={`text-sm font-bold flex justify-between items-center ${selectedThemeId === theme.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      <span>{theme.name}</span>
                      {theme.averageChange !== undefined && (
                        <span className={`${theme.averageChange > 0 ? 'text-rose-500' : (theme.averageChange < 0 ? 'text-blue-500' : 'text-slate-500')} text-xs font-medium`}>
                          {theme.averageChange > 0 ? '▲' : (theme.averageChange < 0 ? '▼' : '')} {Math.abs(theme.averageChange)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* [하단 영역] 사이드바와 메인이 나란히 배치되는 구조 */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === '테마' && (
          <div className="hidden md:block w-72 bg-[#0E1013] border-r border-white/5 overflow-y-auto hide-scrollbar shrink-0 pb-32">
            <div className="p-4">
              <h2 className="text-xl font-bold text-white mb-4">테마 목록</h2>
              {allThemesWithAvgChange.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`cursor-pointer px-4 py-1 rounded-lg transition-all duration-200 mb-1 group
                    ${selectedThemeId === theme.id ? 'bg-blue-600/20' : 'hover:bg-white/[0.03]'}`}
                >
                  <div className={`text-sm font-bold flex justify-between items-center ${selectedThemeId === theme.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    <span>{theme.name}</span>
                    {theme.averageChange !== undefined && (
                      <span className={`${theme.averageChange > 0 ? 'text-rose-500' : (theme.averageChange < 0 ? 'text-blue-500' : 'text-slate-500')} text-xs font-medium`}>
                        {theme.averageChange > 0 ? '▲' : (theme.averageChange < 0 ? '▼' : '')} {Math.abs(theme.averageChange)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 리스트 */}
        <main className="flex-1 overflow-y-auto px-4 py-2 pb-32 hide-scrollbar">
          {activeTab === '투자자별' ? (
            <InvestorCategory investorTab={investorTab} />
          ) : (
            <div className="max-w-full">
              {/* 컬럼 헤더 및 리스트 (기존 스타일 유지) */}
              <div className="grid grid-cols-[1.5rem_1.3fr_0.9fr_1.2fr_0.8fr] md:grid-cols-[3rem_1.5fr_repeat(4,1fr)_140px] text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase px-4 pb-2 border-b border-white/5 mb-2 tracking-[0.15em]">
                <div>순위</div>
                <div className="pl-4">종목명</div>
                <div className="text-right">현재가</div>
                <div className="text-right">등락률</div>
                <div className="text-right">거래량</div>
                <div className="hidden md:block text-right pr-6">거래대금</div>
                <div className="hidden md:block text-center">차트</div>
              </div>

              <div className="space-y-0.5">
                {displayStocks.map((stock, idx) => {
                  const isUp = parseFloat(stock.change) > 0;
                  return (
                    <div key={idx} className="grid grid-cols-[1.5rem_1.5rem_1.3fr_0.9fr_1.2fr_0.8fr] md:grid-cols-[2rem_3rem_1.5fr_repeat(4,1fr)_140px] items-center px-4 sm:px-6 py-0.5 rounded-[24px] hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center justify-center"> {/* Heart Icon container */}
                        <Heart
                          size={16}
                          onClick={() => onFavoriteToggle(stock.code)}
                          className={`transition-colors cursor-pointer ${
                            favoritedStocks.includes(stock.code) ? 'text-red-500 fill-red-500' : 'text-slate-600 hover:text-red-500'
                          }`}
                        />
                      </div>
                      <div className="text-[14px] font-bold text-slate-400">{idx + 1}</div> {/* 순위 */}
                      <Link to={`/stock/${stock.code}`} className="font-bold text-xs sm:text-[16px] text-slate-100 group-hover:text-blue-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis md:pl-4">
                        {stock.name} {/* 종목명 */}
                      </Link>
                      <div className="text-right text-xs sm:text-base font-semibold text-slate-200">{stock.price.toLocaleString()}</div> {/* 현재가 */}
                      <div className={`text-right text-[11px] sm:text-[13px] ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(parseFloat(stock.change))}% {/* 등락률 */}
                      </div>
                      <div className="text-right text-[10px] sm:text-[12px] text-slate-500 font-medium">{formatTradeVolume(stock.tradeVolume)}</div> {/* 거래량 */}
                      <div className="hidden md:block text-right text-[10px] sm:text-[12px] text-slate-500 font-medium pr-6">{formatTradeValueInEok(stock.tradeValue)}</div> {/* 거래대금 */}
                      <div className="hidden md:block h-8 w-full px-6 min-h-[32px]"> {/* 차트 */}
                        <ResponsiveContainer width="100%" height={32} debounce={100}>
                          <LineChart data={stock.chart}>
                            <YAxis domain={['dataMin', 'dataMax']} hide />
                            <Line type="monotone" dataKey="v" stroke={isUp ? '#ef4444' : '#3b82f6'} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>


      </div>
      {showLoginMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          로그인후 이용가능합니다
        </div>
      )}
    </div>
  );
};

export default Home;