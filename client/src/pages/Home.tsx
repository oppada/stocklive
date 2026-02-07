import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorCategory from '../components/InvestorCategory';

const Home = ({ stockPrices = {}, favoritedStocks, onFavoriteToggle, showLoginMessage }: any) => {
  const [activeTab, setActiveTab] = useState('급상승');
  const [investorTab, setInvestorTab] = useState('순매수');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [allThemes, setAllThemes] = useState<any[]>([]);

  const categoryIcons: Record<string, any> = {
    '급상승': <Flame size={16} className="text-[#F04452]" />,
    '급하락': <ArrowDownCircle size={16} className="text-[#3182F6]" />,
    '거래량': <BarChart3 size={16} className="text-[#2ECC71]" />,
    '거래대금': <Coins size={16} className="text-[#F1C40F]" />,
    '테마': <LayoutGrid size={16} className="text-[#9B59B6]" />,
    '투자자별': <Users size={16} className="text-[#3498DB]" />,
  };

  // 데이터 로드
  useEffect(() => {
    fetch('/toss_real_150_themes.json')
      .then(res => res.json())
      .then(data => {
        const formatted = data.themes.map((t: any, i: number) => ({
          id: String(i + 1), name: t.theme_name, stocks: t.stocks
        }));
        setAllThemes(formatted);
      }).catch(console.error);
  }, []);

  const themesWithAvg = allThemes.map(theme => {
    const changes = theme.stocks.map((s: any) => parseFloat(stockPrices[s.code]?.change || '0')).filter((c: any) => !isNaN(c));
    const avg = changes.length > 0 ? (changes.reduce((a: any, b: any) => a + b, 0) / changes.length) : 0;
    return { ...theme, averageChange: parseFloat(avg.toFixed(2)) };
  }).sort((a, b) => (b.averageChange || 0) - (a.averageChange || 0));

  useEffect(() => {
    if (activeTab === '테마' && themesWithAvg.length > 0 && !selectedThemeId) {
      setSelectedThemeId(themesWithAvg[0].id);
    }
  }, [activeTab, themesWithAvg, selectedThemeId]);

  const currentTheme = themesWithAvg.find(t => t.id === selectedThemeId);

  const gridLayout = "grid grid-cols-[16px_20px_104px_53px_53px_50px_50px] md:grid-cols-[45px_60px_0.5fr_110px_90px_100px_90px_140px] items-center gap-1";

  // 데이터 할당 (에러 방지용 초기값)
  let displayStocks: any[] = [];
  
  if (activeTab === '테마') {
    displayStocks = (currentTheme?.stocks.map((s: any) => ({
      name: s.name, code: s.code, price: stockPrices[s.code]?.price || 0,
      change: stockPrices[s.code]?.change || '0', tradeVolume: stockPrices[s.code]?.tradeVolume || '0',
      tradeValue: stockPrices[s.code]?.tradeValue || '0', // Add tradeValue here
      chart: [{v:10},{v:15},{v:12},{v:18},{v:14}]
    })) || []).sort((a: any, b: any) => parseFloat(b.change) - parseFloat(a.change));
  } else if (activeTab !== '투자자별') {
    const mock: any = {
      '급상승': [
        { name: '삼성전자', code: '005930', price: 72500, change: '1.25', tradeVolume: '1500000', tradeValue: '1234567890', chart: [{v:10},{v:12},{v:15},{v:14},{v:18}] },
        { name: 'SK하이닉스', code: '000660', price: 141200, change: '2.40', tradeVolume: '800000', tradeValue: '987654321', chart: [{v:20},{v:22},{v:25},{v:24},{v:28}] },
      ],
      '급하락': [{ name: 'LG에너지솔루션', code: '373220', price: 380000, change: '-3.5', tradeVolume: '200000', tradeValue: '543210987', chart: [{v:30},{v:25},{v:20}] }],
      '거래량': [{ name: '카카오', code: '035720', price: 52000, change: '0.5', tradeVolume: '3000000', tradeValue: '123123123', chart: [{v:10},{v:11},{v:10}] }],
      '거래대금': [{ name: '현대차', code: '005380', price: 240000, change: '1.8', tradeVolume: '500000', tradeValue: '456456456', chart: [{v:15},{v:18},{v:20}] }],
    };
    displayStocks = mock[activeTab] || [];
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0E1013] text-white">
      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-30 bg-[#0E1013] border-b border-white/5">
        <nav className="flex items-center justify-around gap-1 px-2 py-2 hide-scrollbar md:justify-start md:gap-5 md:px-4">
          {['급상승', '급하락', '거래량', '거래대금', '테마', '투자자별'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1 px-0 py-2 rounded-xl text-xs md:text-[14px] md:flex-none md:justify-start md:gap-2 md:px-1 font-bold transition-all whitespace-nowrap
                ${activeTab === tab ? 'text-white bg-[#1C1E23]' : 'text-slate-500 hover:text-slate-300'}`}>
              <span className="hidden md:block">{categoryIcons[tab]}</span> {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 테마 사이드바: 테마명 간격도 타이트하게 조정 */}
        {activeTab === '테마' && (
          <aside className="hidden md:block w-52 border-r border-white/5 overflow-y-auto shrink-0 p-2 hide-scrollbar">
            {themesWithAvg.map((t) => (
              <div key={t.id} onClick={() => setSelectedThemeId(t.id)}
                className={`cursor-pointer px-3 py-1 rounded-xl transition-all ${selectedThemeId === t.id ? 'bg-[#1C1E23]' : 'hover:bg-white/5'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-[14px] truncate max-w-[120px] ${selectedThemeId === t.id ? 'text-white' : 'text-slate-400'}`}>{t.name}</span>
                  <span className={`text-[14px] ${t.averageChange > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{t.averageChange}%</span>
                </div>
              </div>
            ))}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto hide-scrollbar pb-16">
          {/* 테마 탭 모바일용 드롭다운 */}
          {activeTab === '테마' && (
            <div className="md:hidden p-2 mb-1">
              <select 
                value={selectedThemeId || ''} 
                onChange={(e) => setSelectedThemeId(e.target.value)}
                className="w-full bg-[#1C1E23] border border-white/10 rounded-lg px-3 py-1 text-white text-sm"
              >
                {themesWithAvg.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.averageChange > 0 ? '+' : ''}{t.averageChange}%)</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === '투자자별' ? (
            <div className="w-full bg-[#1C1E23] rounded-[32px] p-4 border border-white/5">
              <InvestorCategory investorTab={investorTab} />
            </div>
          ) : (
            <div className="w-full p-4">
              {/* 모든 카테고리에 공통 적용되는 헤더 */}
              <div className={`${gridLayout} pb-3 border-b border-white/5 text-[11px] font-bold text-slate-600 uppercase`}>
                <div className="text-center">#</div>
                <div className="text-center"></div>
                <div>종목명</div>
                <div className="text-right">현재가</div>
                <div className="text-right">등락률</div>
                <div className="text-right">거래대금</div>
                <div className="text-right">거래량</div>
              </div>

              {/* 리스트 아이템 */}
              <div className="mt-1 space-y-1 pb-4">
                {displayStocks.map((stock, idx) => {
                  const isUp = parseFloat(stock.change) > 0;
                  return (
                    <div key={idx} className={`${gridLayout} py-0 rounded-2xl hover:bg-[#1C1E23] transition-all group`}>
                       <div className="text-center text-[14px] font-bold text-slate-500">{idx + 1}</div> {/* Rank */}
                       <div className="flex justify-center">
                        <Heart size={16} onClick={() => onFavoriteToggle(stock.code)}
                          className={`cursor-pointer ${favoritedStocks.includes(stock.code) ? 'text-[#F04452]' : 'text-slate-800'}`} />
                      </div>
                      <div className="overflow-hidden"> {/* Stock Name */}
                        <Link to={`/stock/${stock.code}`} className="font-bold text-xs md:text-[16px] text-slate-100 truncate px-0 group-hover:text-white">
                          {stock.name}
                        </Link>
                      </div>
                      <div className="text-right text-xs md:text-[15px] font-bold text-slate-200 font-mono">{Number(stock.price).toLocaleString()}</div> {/* Current Price */}
                      <div className={`text-right text-xs md:text-[15px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{isUp ? '+' : ''}{stock.change}%</div> {/* Change Percentage */}
                      <div className="text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono">{(parseInt(stock.tradeValue) / 100000000).toFixed(0)}억</div> {/* Trade Value */}
                      <div className="text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono">{(parseInt(stock.tradeVolume) / 10000).toFixed(0)}만</div> {/* Trade Volume */}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;