import { useState, useEffect } from 'react';
import { Heart, LayoutGrid, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Home = ({ favoritedStocks, onFavoriteToggle, stockPrices, user, onLoginClick }: any) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem('activeTab');
    return savedTab || '급상승'; 
  });

  const [investorTab, setInvestorTab] = useState(() => {
    return sessionStorage.getItem('investorTab') || 'buy';
  });

  const [foreignStocks, setForeignStocks] = useState<any[]>([]);
  const [institutionStocks, setInstitutionStocks] = useState<any[]>([]);
  const [individualStocks, setIndividualStocks] = useState<any[]>([]);
  const [investorUpdateTimes, setInvestorUpdateTimes] = useState({ foreign: '', institution: '', individual: '' });
  const [isLoadingInvestor, setIsLoadingInvestor] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(() => {
    return sessionStorage.getItem('selectedThemeId');
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false); 
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [selectedThemeStocks, setSelectedThemeStocks] = useState<any[]>([]);
  const [rankingStocks, setRankingStocks] = useState<any[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [isLoadingThemeStocks, setIsLoadingThemeStocks] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('investorTab', investorTab);
  }, [investorTab]);

  useEffect(() => {
    if (selectedThemeId) {
      sessionStorage.setItem('selectedThemeId', selectedThemeId);
    }
  }, [selectedThemeId]);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/api/themes/top-performing');
        const data = await response.json();
        if (Array.isArray(data)) {
          setAllThemes(data);
          const savedTheme = sessionStorage.getItem('selectedThemeId');
          if (savedTheme && data.find(t => t.name === savedTheme)) {
            setSelectedThemeId(savedTheme);
          } else if (data.length > 0) {
            setSelectedThemeId(data[0].name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch themes:", error);
      }
    };
    fetchThemes();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeTab === '테마' && selectedThemeId) {
        setIsLoadingThemeStocks(true);
        try {
          const response = await fetch(`/api/themes/stocks?name=${encodeURIComponent(selectedThemeId)}`);
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
          
          const dataF = await resF.json();
          const dataI = await resI.json();
          const dataP = await resP.json();

          setForeignStocks(dataF.list || dataF);
          setInstitutionStocks(dataI.list || dataI);
          setIndividualStocks(dataP.list || dataP);
          
          setInvestorUpdateTimes({
            foreign: dataF.updated_at_text || '',
            institution: dataI.updated_at_text || '',
            individual: dataP.updated_at_text || ''
          });
        } catch (error) {
          console.error("Failed to fetch investor data:", error);
        } finally {
          setIsLoadingInvestor(false);
        }
      };
      fetchInvestorData();
    }
  }, [activeTab, investorTab]);

  const getTabColor = (tab: string) => {
    if (activeTab !== tab) return 'text-slate-400 hover:text-slate-900 transition-colors';
    return 'text-slate-900 relative after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full';
  };

  const gridLayout = "grid grid-cols-[20px_25px_1fr_65px_55px] md:grid-cols-[35px_40px_1fr_110px_90px_90px_110px] items-center gap-1 md:gap-3";

  let displayStocks: any[] = [];
  if (activeTab === '관심') {
    displayStocks = favoritedStocks.map((code: string) => {
      const info = stockPrices[code];
      return info ? { ...info, code } : { code, name: '로딩 중...', price: 0, changeRate: 0 };
    });
  }
  else if (activeTab === '테마') displayStocks = selectedThemeStocks;
  else if (['급상승', '급하락', '거래량', '거래대금'].includes(activeTab)) displayStocks = rankingStocks;

  const renderInvestorColumn = (title: string, stocks: any[]) => {
    let timeKey: 'foreign' | 'institution' | 'individual' = 'foreign';
    if (title === '기관') timeKey = 'institution';
    if (title === '개인') timeKey = 'individual';
    const currentTime = investorUpdateTimes[timeKey];

    return (
      <div className="flex flex-col h-full bg-white/95">
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <span className="font-black text-slate-900 text-[14px] uppercase tracking-tight">{title}</span>
          {currentTime && <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">{currentTime}</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {(stocks || []).map((stock: any, idx: number) => {
            const rate = parseFloat(String(stock.changeRate)) || 0;
            const isUp = rate > 0;
            const rawValue = stock.tradeValue || '';
            const displayValue = (typeof rawValue === 'string' && (rawValue.includes('조') || rawValue.includes('억') || rawValue.includes('만'))) 
              ? rawValue.replace(/원/g, '') 
              : (parseInt(rawValue) > 0 ? `${(parseInt(rawValue) / 100000000).toFixed(0)}억` : '---');

            return (
              <div key={`${title}-${stock.code}-${idx}`} className="grid grid-cols-[25px_1fr_55px_65px] items-center px-4 h-11 hover:bg-slate-50 transition-all group">
                <div className="text-[11px] font-bold text-slate-300 font-mono">{idx + 1}</div>
                <Link to={`/stock/${stock.code}`} className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {stock.name}
                </Link>
                <div className={`text-right text-[12px] font-black font-mono ${isUp ? 'text-rose-500' : 'text-blue-600'}`}>
                  {isUp ? '+' : ''}{rate.toFixed(1)}%
                </div>
                <div className="text-right text-[11px] font-bold text-slate-500 font-mono opacity-80">
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      {/* Category Tabs - Maximum Density for Mobile */}
      <div className="shrink-0 mb-2 px-0">
        <nav className="flex items-center justify-between md:justify-start gap-0 md:gap-8 overflow-x-hidden py-1.5 px-0.5 md:px-2">
          {['급상승', '급하락', '거래량', '거래대금', '테마', '투자자별', '관심'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center whitespace-nowrap font-bold text-[12.5px] md:text-[16px] py-1 px-1 md:px-0 transition-all ${getTabColor(tab)} ${tab === '관심' ? 'md:hidden' : ''}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden gap-4 pb-14 md:pb-0">
        <div className="flex flex-1 overflow-hidden gap-4">
          {/* Theme List - Left Sidebar Mode (Restored) */}
          {activeTab === '테마' && (
            <aside className="hidden md:flex flex-col w-64 bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-200 overflow-hidden shrink-0 shadow-md">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="font-bold text-slate-900 text-[14px]">테마별 종목</span>
                <LayoutGrid size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-0.5">
                {(allThemes || []).map((t: any) => (
                  <button 
                    key={t.name} 
                    onClick={() => setSelectedThemeId(t.name)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-[13px] font-bold ${selectedThemeId === t.name ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className={`font-mono text-[11px] ${parseFloat(t.avgChangeRate || 0) > 0 ? (selectedThemeId === t.name ? 'text-rose-200' : 'text-rose-500') : (selectedThemeId === t.name ? 'text-blue-200' : 'text-blue-600')}`}>
                      {parseFloat(t.avgChangeRate || 0).toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main List Card */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[20px] md:rounded-[32px] shadow-md border border-slate-200 overflow-hidden mb-2 md:mb-0">
            {/* Investor Buy/Sell Toggle (Left Aligned & Red/Blue Colors) */}
            {activeTab === '투자자별' && (
              <div className="p-4 border-b border-slate-100 flex items-center justify-start gap-2 bg-slate-50/30">
                <button 
                  onClick={() => setInvestorTab('buy')}
                  className={`px-6 py-1.5 rounded-full text-[13px] font-bold transition-all ${investorTab === 'buy' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                >
                  순매수
                </button>
                <button 
                  onClick={() => setInvestorTab('sell')}
                  className={`px-6 py-1.5 rounded-full text-[13px] font-bold transition-all ${investorTab === 'sell' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                >
                  순매도
                </button>
              </div>
            )}

            {/* Mobile Theme Selector */}
            {activeTab === '테마' && (
              <div className="md:hidden p-3 border-b border-slate-100 bg-slate-50/30">
                <button 
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 flex justify-between items-center shadow-sm"
                >
                  <span className="font-bold text-blue-600 text-[14px]">{selectedThemeId}</span>
                  <ChevronRight size={16} className={`transform transition-transform ${isThemeMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {isThemeMenuOpen && (
                  <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[300px] overflow-y-auto p-1">
                    {(allThemes || []).map((t: any) => (
                      <button key={t.name} onClick={() => { setSelectedThemeId(t.name); setIsThemeMenuOpen(false); }}
                        className="w-full px-4 py-3 rounded-lg text-left text-[13px] font-bold active:bg-blue-50 border-b border-slate-50 last:border-0"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {activeTab === '투자자별' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 h-full bg-slate-200">
                  {isLoadingInvestor && foreignStocks.length === 0 ? (
                    <div className="col-span-3 py-40 text-center text-slate-300 font-bold italic bg-white h-full">데이터 동기화 중...</div>
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
                  {/* Table Header */}
                  <div className={`${gridLayout} px-6 md:px-10 py-3 border-b border-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-tight`}>
                      <div className="text-center">#</div>
                      <div className="flex justify-center"><Heart size={14} fill="currentColor" /></div>
                      <div>종목명</div>
                      <div className="text-right">현재가</div>
                      <div className="text-right">등락률</div>
                      <div className="text-right hidden md:block">거래대금</div>
                      <div className="text-right hidden md:block">거래량</div>
                  </div>
                  
                  <div className="divide-y divide-slate-50">
                    {activeTab === '관심' && !user ? (
                      <div className="py-40 text-center flex flex-col items-center gap-4">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><Heart size={32} /></div>
                         <button onClick={onLoginClick} className="px-6 py-2 bg-blue-600 rounded-full text-[14px] font-bold text-white shadow-lg">로그인하고 관심종목 보기</button>
                      </div>
                    ) : ((isLoadingStocks && !['테마', '관심'].includes(activeTab)) || (isLoadingThemeStocks && activeTab === '테마')) && displayStocks.length === 0 ? (
                      <div className="py-40 text-center text-slate-300 font-bold animate-pulse italic">종목 정보를 불러오는 중...</div>
                    ) : (
                      (displayStocks || []).map((stock: any, idx: number) => {                        const rate = parseFloat(String(stock.changeRate)) || 0;
                        const isUp = rate > 0;
                        const isDown = rate < 0;
                        
                        return (
                          <div key={`${activeTab}-${stock.code}-${idx}`} className={`${gridLayout} px-6 md:px-10 py-2 hover:bg-slate-50/50 transition-all cursor-pointer group`} onClick={() => navigate(`/stock/${stock.code}`)}>
                             <div className="text-[13px] font-bold text-slate-500 font-mono text-center">{idx + 1}</div>
                             <div className="flex justify-center" onClick={(e) => { e.stopPropagation(); onFavoriteToggle(stock.code); }}>
                                <Heart size={16} className={`transition-all ${favoritedStocks.includes(stock.code) ? 'text-rose-500 fill-rose-500' : 'text-slate-400 hover:text-rose-300'}`} />
                             </div>
                             <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[15px] md:text-[16px] text-slate-900 group-hover:text-blue-600 transition-colors truncate">{stock.name}</span>
                             </div>
                             <div className="text-right text-[14px] md:text-[15px] font-bold text-slate-900 font-mono">{Number(stock.price || 0).toLocaleString()}</div>
                             <div className={`text-right text-[14px] md:text-[15px] font-bold font-mono ${isUp ? 'text-rose-500' : (isDown ? 'text-blue-600' : 'text-slate-400')}`}>
                               {isUp ? '+' : ''}{rate.toFixed(1)}%
                             </div>
                             <div className="text-right text-[14px] md:text-[15px] font-bold text-slate-600 font-mono hidden md:block">
                               {(() => {
                                 const val = parseInt(stock.tradeValue || '0');
                                 if (val >= 1000000000000) return `${(val / 1000000000000).toFixed(1)}조`;
                                 return `${(val / 100000000).toFixed(0)}억`;
                               })()}
                             </div>
                             <div className="text-right text-[14px] md:text-[15px] font-bold text-slate-500 font-mono hidden md:block">
                               {stock.volume >= 10000 ? `${(stock.volume / 10000).toFixed(0)}만` : Number(stock.volume).toLocaleString()}
                             </div>                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;