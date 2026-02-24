import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = ({ favoritedStocks, onFavoriteToggle }: any) => {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || '급상승'; 
  });

  const [investorTab, setInvestorTab] = useState('buy'); // 'buy' or 'sell'
  const [foreignStocks, setForeignStocks] = useState<any[]>([]);
  const [institutionStocks, setInstitutionStocks] = useState<any[]>([]);
  const [individualStocks, setIndividualStocks] = useState<any[]>([]);
  const [isLoadingInvestor, setIsLoadingInvestor] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [selectedThemeStocks, setSelectedThemeStocks] = useState<any[]>([]);
  const [rankingStocks, setRankingStocks] = useState<any[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [isLoadingThemeStocks, setIsLoadingThemeStocks] = useState(false);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/api/themes/top-performing');
        const data = await response.json();
        if (Array.isArray(data)) {
          setAllThemes(data);
          if (data.length > 0) setSelectedThemeId(data[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch themes:", error);
      } finally {
        setIsLoadingThemes(false);
      }
    };
    fetchThemes();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeTab === '테마' && selectedThemeId) {
        setIsLoadingThemeStocks(true);
        try {
          const response = await fetch(`/api/themes/${selectedThemeId}/stocks`);
          const data = await response.json();
          if (Array.isArray(data)) setSelectedThemeStocks(data);
        } catch (error) {
          console.error("Failed to fetch theme stocks:", error);
        } finally {
          setIsLoadingThemeStocks(false);
        }
      }
    })();
  }, [activeTab, selectedThemeId]);

  useEffect(() => {
    const rankingCategories = ['급상승', '급하락', '거래량', '거래대금'];
    if (rankingCategories.includes(activeTab)) {
      setIsLoadingStocks(true);
      const fetchRanking = async () => {
        try {
          let type = '';
          if (activeTab === '급상승') type = 'gainer';
          else if (activeTab === '급하락') type = 'loser';
          else if (activeTab === '거래량') type = 'volume';
          else if (activeTab === '거래대금') type = 'value';

          const response = await fetch(`/api/ranking/${type}`);
          const data = await response.json();
          setRankingStocks(data);
        } catch (error) {
          console.error("Failed to fetch ranking:", error);
        } finally {
          setIsLoadingStocks(false);
        }
      };
      fetchRanking();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === '투자자별') {
      const fetchInvestorData = async () => {
        setIsLoadingInvestor(true);
        try {
          const [resF, resI, resP] = await Promise.all([
            fetch(`/api/investor-trend/${investorTab}?investor=foreign`),
            fetch(`/api/investor-trend/${investorTab}?investor=institution`),
            fetch(`/api/investor-trend/${investorTab}?investor=individual`)
          ]);
          setForeignStocks(await resF.json());
          setInstitutionStocks(await resI.json());
          setIndividualStocks(await resP.json());
        } catch (error) {
          console.error("Failed to fetch investor data:", error);
        } finally {
          setIsLoadingInvestor(false);
        }
      };
      fetchInvestorData();
    }
  }, [activeTab, investorTab]);

  const categoryIcons: Record<string, any> = {
    '급상승': <Flame size={16} className="text-[#F04452]" />,
    '급하락': <ArrowDownCircle size={16} className="text-[#3182F6]" />,
    '거래량': <BarChart3 size={16} className="text-[#2ECC71]" />,
    '거래대금': <Coins size={16} className="text-[#F1C40F]" />,
    '테마': <LayoutGrid size={16} className="text-[#9B59B6]" />,
    '투자자별': <Users size={16} className="text-[#3498DB]" />,
  };

  const gridLayout = "grid grid-cols-[16px_20px_104px_53px_53px_50px_50px] md:grid-cols-[45px_60px_0.5fr_110px_90px_100px_90px_120px] items-center gap-1";

  let displayStocks: any[] = [];
  if (activeTab === '테마') displayStocks = selectedThemeStocks;
  else if (['급상승', '급하락', '거래량', '거래대금'].includes(activeTab)) displayStocks = rankingStocks;

  const renderInvestorColumn = (title: string, stocks: any[]) => (
    <div className="flex flex-col space-y-1 min-h-[500px]">
      <div className="px-3 py-1.5 bg-[#1C1E23] rounded-xl text-center font-bold text-[13px] text-slate-300 border border-white/5">
        {title}
      </div>
      <div className="grid grid-cols-[25px_1fr_55px_65px] px-2 py-1 text-[10px] font-bold text-slate-600 uppercase border-b border-white/5 h-8 items-center">
        <div>#</div>
        <div>종목명</div>
        <div className="text-right">등락률</div>
        <div className="text-right">대금</div>
      </div>
      <div className="space-y-0">
        {stocks.map((stock, idx) => {
          const isUp = stock.changeRate > 0;
          return (
            <div key={`${title}-${stock.code}-${idx}`} className="grid grid-cols-[25px_1fr_55px_65px] items-center px-2 py-0 hover:bg-[#1C1E23] rounded-lg transition-all group h-8">
              <div className="text-[11px] font-bold text-slate-500">{idx + 1}</div>
              <Link to={`/stock/${stock.code}`} className="text-[12px] font-bold text-slate-200 truncate group-hover:text-white">
                {stock.name}
              </Link>
              <div className={`text-right text-[11px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                {isUp ? '+' : ''}{stock.changeRate.toFixed(2)}%
              </div>
              <div className="text-right text-[11px] font-bold text-slate-500 font-mono">
                {(parseInt(stock.tradeValue) / 100000000).toFixed(0)}억
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#0E1013] text-white">
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

      {activeTab === '투자자별' && (
        <div className="px-4 py-2 bg-[#0E1013] border-b border-white/5 flex gap-2">
          <button onClick={() => setInvestorTab('buy')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition-all ${investorTab === 'buy' ? 'bg-[#F04452] text-white' : 'bg-[#1C1E23] text-slate-400'}`}>
            순매수
          </button>
          <button onClick={() => setInvestorTab('sell')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition-all ${investorTab === 'sell' ? 'bg-[#3182F6] text-white' : 'bg-[#1C1E23] text-slate-400'}`}>
            순매도
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {activeTab === '테마' && (
          <aside className="hidden md:block w-52 border-r border-white/5 overflow-y-auto shrink-0 p-2 hide-scrollbar">
            {isLoadingThemes ? (
              <div className="p-2 text-slate-500 text-sm">테마 불러오는 중...</div>
            ) : (
              allThemes.map((t) => (
                <div key={t.name} onClick={() => setSelectedThemeId(t.name)}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl transition-all mb-1 ${selectedThemeId === t.name ? 'bg-[#1C1E23]' : 'hover:bg-white/5'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-[13px] truncate max-w-[110px] ${selectedThemeId === t.name ? 'text-white' : 'text-slate-400'}`}>{t.name}</span>
                    <span className={`text-[12px] font-bold ${t.avgChangeRate > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{t.avgChangeRate.toFixed(2)}%</span>
                  </div>
                </div>
              ))
            )}
          </aside>
        )}

        <main className="flex-1 overflow-y-auto hide-scrollbar pb-16">
          <div className="min-h-full">
            {activeTab === '투자자별' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                {isLoadingInvestor && foreignStocks.length === 0 ? (
                  <div className="col-span-1 md:col-span-3 text-center text-slate-400 py-20">투자자별 데이터 로딩 중...</div>
                ) : (
                  <>
                    {renderInvestorColumn('외국인', foreignStocks)}
                    {renderInvestorColumn('기관', institutionStocks)}
                    {renderInvestorColumn('개인', individualStocks)}
                  </>
                )}
              </div>
            ) : (
              <div className="w-full">
                {activeTab === '테마' && (
                  <div className="md:hidden p-2 mb-1">
                    <select value={selectedThemeId || ''} onChange={(e) => setSelectedThemeId(e.target.value)} className="w-full bg-[#1C1E23] border border-white/10 rounded-lg px-3 py-1 text-white text-sm">
                      {allThemes.map(t => (
                        <option key={t.name} value={t.name}>{t.name} ({t.avgChangeRate.toFixed(2)}%)</option>
                      ))}
                    </select>
                  </div>
                )}
              <div className="px-2 py-2">
                <div className={`${gridLayout} pb-2 border-b border-white/5 text-[11px] font-bold text-slate-600 uppercase h-8 items-center`}>
                  <div className="text-center">#</div>
                  <div className="text-center"></div>
                  <div>종목명</div>
                  <div className="text-right">현재가</div>
                  <div className="text-right">등락률</div>
                  <div className="text-right">거래대금</div>
                  <div className="text-right">거래량</div>
                  <div className="hidden md:block text-center">차트</div>
                </div>
                
                <div className="min-h-[600px] mt-0.5">
                  {((isLoadingStocks && activeTab !== '테마') || (isLoadingThemeStocks && activeTab === '테마')) && rankingStocks.length === 0 ? (
                    <div className="text-center text-slate-400 py-20">데이터 로딩 중...</div>
                  ) : (
                    <div className="space-y-0">
                      {displayStocks.map((stock, idx) => {
                        const isUp = stock.changeRate > 0;
                        return (
                          <div key={`${activeTab}-${stock.code}-${idx}`} className={`${gridLayout} py-0 rounded-2xl hover:bg-[#1C1E23] transition-all group h-9`}>
                             <div className="text-center text-[13px] font-bold text-slate-500">{idx + 1}</div>
                             <div className="flex justify-center">
                              <Heart size={14} onClick={() => onFavoriteToggle(stock.code)} className={`cursor-pointer ${favoritedStocks.includes(stock.code) ? 'text-[#F04452]' : 'text-slate-800'}`} />
                            </div>
                            <Link to={`/stock/${stock.code}`} className="font-bold text-xs md:text-[15px] text-slate-100 truncate px-0 group-hover:text-white">{stock.name}</Link>
                            <div className="text-right text-xs md:text-[14px] font-bold text-slate-200 font-mono">{Number(stock.price).toLocaleString()}</div>
                            <div className={`text-right text-xs md:text-[14px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{isUp ? '+' : ''}{(stock.changeRate || 0).toFixed(2)}%</div>
                            <div className="text-right text-xs md:text-[14px] font-bold text-slate-500 font-mono">{(parseInt(stock.tradeValue) / 100000000).toFixed(0)}억</div>
                            <div className="text-right text-xs md:text-[14px] font-bold text-slate-500 font-mono">{((stock.volume || 0) / 10000).toFixed(0)}만</div>
                            <div className="hidden md:flex justify-center items-center h-full w-full">
                              <ResponsiveContainer width={100} height={28}>
                                <LineChart data={stock.chart}><YAxis hide domain={['dataMin', 'dataMax']} /><Line type="monotone" dataKey="v" stroke={isUp ? '#F04452' : '#3182F6'} strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
