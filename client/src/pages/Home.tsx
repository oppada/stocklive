import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stock {
  name: string;
  code: string;
  price: number;
  change: number;
  amount: number;
  volume: string;
  chart: { v: number }[];
}

interface Theme {
  id: string;
  name: string;
  description: string;
  stocks: Stock[];
}

const Home = ({ stockPrices = {} }: { stockPrices?: Record<string, any> }) => {
  const [activeTab, setActiveTab] = useState('테마');
  const [selectedThemeId, setSelectedThemeId] = useState('1');



  const mockThemes: Theme[] = [
    {
      id: '1',
      name: 'AI 관련주',
      description: '인공지능 기술 관련 종목',
      stocks: [
        { name: '한글과컴퓨터', code: '030520', price: 25000, change: 5.2, amount: 1200, volume: '1.2조', chart: [{v:10},{v:15},{v:20},{v:18},{v:25}] },
        { name: '셀바스AI', code: '108320', price: 18000, change: -1.3, amount: -250, volume: '5000억', chart: [{v:20},{v:18},{v:16},{v:17},{v:15}] },
      ]
    },
    {
      id: '2',
      name: '반도체',
      description: '반도체 제조 및 장비 관련 종목',
      stocks: [
        { name: '삼성전자', code: '005930', price: 78000, change: 1.1, amount: 800, volume: '2.5조', chart: [{v:75},{v:76},{v:78},{v:77},{v:79}] },
      ]
    }
  ];

  const currentTheme = mockThemes.find(t => t.id === selectedThemeId); // Inserted here

  const mockCategoryData: Record<string, Stock[]> = {
    '급상승': [
      { name: 'NAVER', code: '035420', price: 200000, change: 10.5, amount: 20000, volume: '5.0조', chart: [{v:10},{v:15},{v:20},{v:18},{v:25}] },
      { name: '카카오', code: '035720', price: 50000, change: 8.2, amount: 5000, volume: '2.0조', chart: [{v:25},{v:20},{v:18},{v:20},{v:22}] },
    ],
    '급하락': [
      { name: 'LG화학', code: '051910', price: 400000, change: -7.1, amount: -15000, volume: '3.5조', chart: [{v:20},{v:25},{v:18},{v:15},{v:10}] },
      { name: 'SK이노베이션', code: '096770', price: 150000, change: -5.3, amount: -8000, volume: '1.8조', chart: [{v:15},{v:17},{v:16},{v:18},{v:12}] },
    ],
    '거래량': [
      { name: '삼성전자우', code: '005935', price: 65000, change: 1.2, amount: 300, volume: '10.0조', chart: [{v:18},{v:20},{v:22},{v:20},{v:24}] },
      { name: '현대차2우B', code: '005387', price: 120000, change: 0.8, amount: 100, volume: '8.0조', chart: [{v:22},{v:20},{v:24},{v:23},{v:25}] },
    ],
    '거래대금': [
      { name: '셀트리온', code: '068270', price: 180000, change: 3.5, amount: 2000, volume: '7.0조', chart: [{v:12},{v:15},{v:17},{v:16},{v:19}] },
      { name: 'POSCO홀딩스', code: '005490', price: 450000, change: 2.1, amount: 5000, volume: '6.5조', chart: [{v:10},{v:12},{v:14},{v:13},{v:16}] },
    ],
  };

  let displayStocks: Stock[] = [];
  if (activeTab === '테마') {
    displayStocks = currentTheme?.stocks || [];
  } else {
    displayStocks = mockCategoryData[activeTab] || [];
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0E1013] text-white overflow-hidden">
      
      {/* [상단 영역 1] 사라졌던 카테고리 메뉴 복구 */}
      <div className="w-full bg-[#0E1013] border-b border-white/5 shrink-0">
        <nav className="flex items-center gap-1 px-6 py-3 no-scrollbar overflow-x-auto">
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
            {mockThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`cursor-pointer px-5 py-4 rounded-2xl transition-all duration-200 mb-2 group
                  ${selectedThemeId === theme.id ? 'bg-blue-600/10' : 'hover:bg-white/[0.03]'}`}
              >
                <div className={`text-[15px] font-bold ${selectedThemeId === theme.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {theme.name}
                </div>
                <div className="text-[12px] text-slate-500 mt-1 line-clamp-1 opacity-60">
                  {theme.description}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* [오른쪽] 메인 콘텐츠 리스트 */}
        <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32 no-scrollbar">
          <div className="max-w-6xl mx-auto">


            {/* 컬럼 헤더 및 리스트 (기존 스타일 유지) */}
            <div className="grid grid-cols-3 md:grid-cols-5 text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase px-6 pb-4 border-b border-white/5 mb-4 tracking-[0.15em]">
              <div>종목명</div>
              <div className="text-right">현재가</div>
              <div className="text-right">등락률</div>
              <div className="hidden md:block text-right">거래대금</div>
              <div className="hidden md:block text-center">차트</div>
            </div>

            <div className="space-y-1">
              {displayStocks.map((stock, idx) => {
                const liveData = stockPrices[stock.code];
                const price = liveData?.price || stock.price;
                const changeRate = liveData?.changeRate || stock.change;
                const isUp = changeRate > 0;

                return (
                  <div key={idx} className="grid grid-cols-3 md:grid-cols-5 items-center px-6 py-5 rounded-[24px] hover:bg-white/[0.04] transition-all group">
                    <Link to={`/stock/${stock.code}`} className="font-bold text-sm sm:text-[16px] text-slate-100 group-hover:text-blue-400 transition-colors">
                      {stock.name} {/* 종목명 */}
                    </Link>
                    <div className="text-right text-xs sm:text-base font-semibold text-slate-200">{price.toLocaleString()}</div> {/* 현재가 */}
                    <div className={`text-right text-[11px] sm:text-[13px] ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                      {isUp ? '▲' : '▼'} {Math.abs(stock.amount).toLocaleString()} ({changeRate}%) {/* 등락률 */}
                    </div>
                    <div className="hidden md:block text-right text-[10px] sm:text-[12px] text-slate-500 font-medium">{stock.volume}</div> {/* 거래대금 */}
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