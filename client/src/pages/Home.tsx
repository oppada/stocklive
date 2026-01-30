import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import tossThemesData from '../../toss_real_150_themes.json';

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

const Home = ({ stockPrices = {} }: { stockPrices?: Record<string, StockData> }) => {
  const [activeTab, setActiveTab] = useState('테마');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null); // Default to the first theme's ID

  const allThemes: Theme[] = tossThemesData.themes.map((theme, index) => ({
    id: String(index + 1),
    name: theme.theme_name,
    description: theme.theme_name,
    stocks: theme.stocks.map(stock => ({ name: stock.name, code: stock.code }))
  }));

  // Calculate average change for each theme
  const allThemesWithAvgChange: Theme[] = allThemes.map(theme => {
    const changes = theme.stocks
      .map(stock => parseFloat(stockPrices[stock.code]?.change || '0'))
      .filter(change => !isNaN(change));

    const averageChange = changes.length > 0
      ? (changes.reduce((sum, current) => sum + current, 0) / changes.length)
      : 0;

    return { ...theme, averageChange: parseFloat(averageChange.toFixed(2)) };
  });

  // Set initial selectedThemeId to the first theme's ID if not already set
  useEffect(() => {
    if (allThemesWithAvgChange.length > 0 && selectedThemeId === null) {
      setSelectedThemeId(allThemesWithAvgChange[0].id);
    }
  }, [allThemesWithAvgChange, selectedThemeId]);

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
    <div className="flex flex-col h-screen w-full bg-[#0E1013] text-white overflow-hidden">
      
      {/* [상단 영역 1] 사라졌던 카테고리 메뉴 복구 */}
      <div className="w-full bg-[#0E1013] border-b border-white/5 shrink-0">
        <nav className="flex items-center gap-1 px-3 sm:px-6 py-3 no-scrollbar overflow-x-auto">
          {['테마', '급상승', '급하락', '거래량', '거래대금'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 sm:px-4 sm:py-1.5 rounded-xl text-xs sm:text-[14px] font-bold transition-all whitespace-nowrap
                ${activeTab === tab ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* [하단 영역] 사이드바와 메인이 나란히 배치되는 구조 */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* [왼쪽] 마켓테마 사이드바 (상단 메뉴 아래부터 시작하도록 고정) */}
        <aside className="hidden md:flex w-72 bg-[#0E1013] border-r border-white/5 flex-col pt-8 shrink-0">
          <div className="px-8 mb-6">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Activity size={14} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Market Themes</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">테마별 탐색</h1>
          </div>

          <div className="flex-1 px-4 overflow-y-auto no-scrollbar">
            {allThemesWithAvgChange.map((theme) => (
              <div
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`cursor-pointer px-5 py-4 rounded-2xl transition-all duration-200 mb-2 group
                  ${selectedThemeId === theme.id ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]'}`}
              >
                <div className={`text-[15px] font-bold flex justify-between items-center ${selectedThemeId === theme.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  <span>{theme.name}</span>
                  {theme.averageChange !== undefined && (
                    <span className={`${theme.averageChange > 0 ? 'text-rose-500' : (theme.averageChange < 0 ? 'text-blue-500' : 'text-slate-500')} text-[13px] font-medium`}>
                      {theme.averageChange > 0 ? '▲' : (theme.averageChange < 0 ? '▼' : '')} {Math.abs(theme.averageChange)}%
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-slate-500 mt-1 line-clamp-1 opacity-60">
                  {theme.description}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* [오른쪽] 메인 콘텐츠 리스트 */}
        <main className="flex-1 overflow-y-auto px-2 py-6 md:p-12 pb-32 no-scrollbar">
          <div className="max-w-6xl mx-auto">


            {/* 컬럼 헤더 및 리스트 (기존 스타일 유지) */}
            <div className="grid grid-cols-[1.5rem_1.3fr_0.9fr_1.2fr_0.8fr] md:grid-cols-[3rem_1.5fr_repeat(4,1fr)_140px] text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase px-4 sm:px-6 pb-4 border-b border-white/5 mb-4 tracking-[0.15em]">
              <div>순위</div>
              <div className="pl-4">종목명</div>
              <div className="text-right">현재가</div>
              <div className="text-right">등락률</div>
              <div className="text-right">거래량</div>
              <div className="hidden md:block text-right pr-6">거래대금</div>
              <div className="hidden md:block text-center">차트</div>
            </div>

            <div className="space-y-1">
              {displayStocks.map((stock, idx) => {
                const isUp = parseFloat(stock.change) > 0;
                return (
                  <div key={idx} className="grid grid-cols-[1.5rem_1.3fr_0.9fr_1.2fr_0.8fr] md:grid-cols-[3rem_1.5fr_repeat(4,1fr)_140px] items-center px-4 sm:px-6 py-1 rounded-[24px] hover:bg-white/[0.04] transition-all group">
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
        </main>
      </div>
    </div>
  );
};

export default Home;