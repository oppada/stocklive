import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorCategory from '../components/InvestorCategory';

const Home = ({ favoritedStocks, onFavoriteToggle }: any) => {
  const [activeTab, setActiveTab] = useState('급상승');
  const [investorTab] = useState('순매수');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [selectedThemeStocks, setSelectedThemeStocks] = useState<any[]>([]); // New state for stocks of selected theme
  const [rankingStocks, setRankingStocks] = useState<any[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);


  // Fetch top performing themes from backend
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/api/themes/top-performing'); // Use new backend API
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Top Performing Themes Data:', data); // DEBUGGING
        if (Array.isArray(data)) {
          setAllThemes(data);
          if (data.length > 0) {
            setSelectedThemeId(data[0].name);
          }
        } else {
          setAllThemes([]); // Ensure it's always an array
        }
      } catch (error) {
        console.error("Failed to fetch top performing themes:", error);
        setAllThemes([]); // Set to empty array on error to prevent crash
      } finally {
        setIsLoadingThemes(false);
      }
    };
    fetchThemes();
  }, []); // Empty dependency array means this runs once on mount

  // Fetch stocks for the selected theme from backend
  useEffect(() => {
        (async () => {
          if (activeTab === '테마' && selectedThemeId) {
            try {
              const response = await fetch(`/api/themes/${selectedThemeId}/stocks`); // Use new backend API
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              console.log(`Stocks for theme ${selectedThemeId}:`, data); // DEBUGGING
              if (Array.isArray(data)) {
                setSelectedThemeStocks(data);
              } else {
                setSelectedThemeStocks([]);
              }
            } catch (error) {
              console.error(`Failed to fetch stocks for theme ${selectedThemeId}:`, error);
              setSelectedThemeStocks([]); // Set to empty array on error
            }
          } else {
            setSelectedThemeStocks([]); // Clear stocks if not in theme tab or no theme selected
          }
        })();
  }, [activeTab, selectedThemeId]); // Re-run when activeTab or selectedThemeId changes

  // Fetch ranking data for other categories from backend
  useEffect(() => {
    const rankingCategories = ['급상승', '급하락', '거래량', '거래대금'];
    if (rankingCategories.includes(activeTab)) {
      setIsLoadingStocks(true);
      const fetchRanking = async () => {
        try {
          let rankingType;
          switch (activeTab) {
            case '급상승': rankingType = 'gainer'; break;
            case '급하락': rankingType = 'loser'; break;
            case '거래량': rankingType = 'volume'; break;
            case '거래대금': rankingType = 'value'; break;
            default: rankingType = ''; break;
          }

          if (rankingType) {
            const response = await fetch(`/api/ranking/${rankingType}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Ranking data for ${activeTab}:`, data); // DEBUGGING
            setRankingStocks(data);
          }
        } catch (error) {
          console.error(`Failed to fetch ranking data for ${activeTab}:`, error);
          setRankingStocks([]);
        } finally {
          setIsLoadingStocks(false);
        }
      };
      fetchRanking();
    } else {
      setRankingStocks([]); // Clear ranking stocks if not in a ranking tab
    }
  }, [activeTab]);

  const categoryIcons: Record<string, any> = {
    '급상승': <Flame size={16} className="text-[#F04452]" />,
    '급하락': <ArrowDownCircle size={16} className="text-[#3182F6]" />,
    '거래량': <BarChart3 size={16} className="text-[#2ECC71]" />,
    '거래대금': <Coins size={16} className="text-[#F1C40F]" />,
    '테마': <LayoutGrid size={16} className="text-[#9B59B6]" />,
    '투자자별': <Users size={16} className="text-[#3498DB]" />,
  };





  const gridLayout = "grid grid-cols-[16px_20px_104px_53px_53px_50px_50px] md:grid-cols-[45px_60px_0.5fr_110px_90px_100px_90px_120px] items-center gap-1";

  // 데이터 할당 (에러 방지용 초기값)
  let displayStocks: any[] = [];
  
  if (activeTab === '테마') {
    displayStocks = selectedThemeStocks; // Use stocks fetched from new backend API
  } else if (['급상승', '급하락', '거래량', '거래대금'].includes(activeTab)) {
    displayStocks = rankingStocks; // Use fetched ranking data
  } else if (activeTab !== '투자자별') {
    displayStocks = []; // No mock data for other categories
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
            {isLoadingThemes ? (
              <div className="p-2 text-slate-500">테마 로딩 중...</div>
            ) : (
              allThemes.map((t) => ( // Use allThemes now
                <div key={t.name} onClick={() => setSelectedThemeId(t.name)} // Use name as ID
                  className={`cursor-pointer px-3 py-1 rounded-xl transition-all ${selectedThemeId === t.name ? 'bg-[#1C1E23]' : 'hover:bg-white/5'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-[14px] truncate max-w-[120px] ${selectedThemeId === t.name ? 'text-white' : 'text-slate-400'}`}>{t.name}</span>
                    <span className={`text-[14px] ${t.avgChangeRate > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{t.avgChangeRate.toFixed(2)}%</span>
                  </div>
                </div>
              ))
            )}
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
                {isLoadingThemes ? (
                  <option>테마 로딩 중...</option>
                ) : (
                  allThemes.map(t => ( // Use allThemes
                    <option key={t.name} value={t.name}>{t.name} ({t.avgChangeRate > 0 ? '+' : ''}{t.avgChangeRate.toFixed(2)}%)</option>
                  ))
                )}
              </select>
            </div>
          )}

          {activeTab === '투자자별' ? (
            <div className="w-full bg-[#1C1E23] rounded-[32px] p-4 border border-white/5">
              <InvestorCategory investorTab={investorTab} />
            </div>
          ) : (
            <div className="w-full px-2 py-4">
              {/* 모든 카테고리에 공통 적용되는 헤더 */}
              <div className={`${gridLayout} pb-3 border-b border-white/5 text-[11px] font-bold text-slate-600 uppercase`}>
                <div className="text-center">#</div>
                <div className="text-center"></div>
                <div>종목명</div>
                <div className="text-right">현재가</div>
                <div className="text-right">등락률</div>
                <div className="text-right">거래대금</div>
                <div className="text-right">거래량</div>
                <div className="hidden md:block text-center">차트</div> {/* Chart column for PC */}
              </div>

              {/* 로딩 인디케이터 */}
              {isLoadingStocks && (activeTab !== '테마') && ( // Only show loading for ranking, not theme
                <div className="text-center text-slate-400 py-4">데이터 로딩 중...</div>
              )}

              {/* 리스트 아이템 */}
              {!isLoadingStocks && displayStocks.length > 0 ? (
                <div className="mt-1 space-y-1 pb-4">
                  {displayStocks.map((stock, idx) => {
                    const isUp = stock.changeRate > 0;
                    return (
                      <div key={stock.code} className={`${gridLayout} py-0 rounded-2xl hover:bg-[#1C1E23] transition-all group`}>
                         <div className="text-center text-[14px] font-bold text-slate-500">{idx + 1}</div> {/* Rank */}
                         <div className="flex justify-center">
                          <Heart size={16} onClick={() => onFavoriteToggle(stock.code)}
                            className={`cursor-pointer ${favoritedStocks.includes(stock.code) ? 'text-[#F04452]' : 'text-slate-800'}`} />
                        </div>
                        <div className="overflow-hidden"> {/* Stock Name */}
                          <Link to={`/stock/${stock.code}`} className="font-bold text-xs md:text-[16px] text-slate-100 truncate px-0 group-hover:text-white">
                            {stock.name || stock.code} {/* Display stock code if name is missing for some reason */}
                          </Link>
                        </div>
                        <div className="text-right text-xs md:text-[15px] font-bold text-slate-200 font-mono">{Number(stock.price).toLocaleString()}</div> {/* Current Price */}
                        <div className={`text-right text-xs md:text-[15px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{isUp ? '+' : ''}{(stock.changeRate || 0).toFixed(2)}%</div> {/* Change Percentage */}
                        <div className="text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono">{(parseInt(stock.tradeValue) / 100000000).toFixed(0)}억</div> {/* Trade Value */}
                        <div className="text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono">{(parseInt(stock.tradeVolume) / 10000).toFixed(0)}만</div> {/* Trade Volume */}
                        {/* Chart */}
                        <div className="hidden md:flex justify-center items-center h-full w-full">
                          <ResponsiveContainer width={108} height={36}>
                            <LineChart data={stock.chart}>
                              <YAxis hide domain={['dataMin', 'dataMax']} />
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke={isUp ? '#F04452' : '#3182F6'}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (!isLoadingStocks && activeTab !== '테마' && activeTab !== '투자자별') ? (
                <div className="text-center text-slate-400 py-4">데이터를 불러올 수 없습니다.</div>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;