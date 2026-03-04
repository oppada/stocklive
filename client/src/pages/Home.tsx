import { useState, useEffect } from 'react';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users, ChevronRight } from 'lucide-react';
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
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
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

  const categoryIcons: Record<string, any> = {
    '관심': <Heart size={14} fill="currentColor" />,
    '급상승': <Flame size={14} fill="currentColor" />,
    '급하락': <ArrowDownCircle size={14} fill="currentColor" />,
    '거래량': <BarChart3 size={14} fill="currentColor" />,
    '거래대금': <Coins size={14} fill="currentColor" />,
    '테마': <LayoutGrid size={14} fill="currentColor" />,
    '투자자별': <Users size={14} fill="currentColor" />,
  };

  const getTabColor = (tab: string) => {
    if (activeTab !== tab) return 'text-slate-400 bg-transparent hover:text-slate-600 hover:bg-slate-100';
    switch (tab) {
      case '급상승': return 'text-white bg-rose-500 shadow-md shadow-rose-500/20';
      case '급하락': return 'text-white bg-indigo-600 shadow-md shadow-indigo-600/20';
      case '거래대금': return 'text-white bg-amber-600 shadow-md shadow-amber-600/20';
      case '테마': return 'text-white bg-violet-600 shadow-md shadow-violet-600/20';
      case '투자자별': return 'text-white bg-emerald-600 shadow-md shadow-emerald-600/20';
      case '관심': return 'text-white bg-rose-500 shadow-md shadow-rose-500/20';
      default: return 'text-white bg-slate-900 shadow-md shadow-slate-900/20';
    }
  };

  const gridLayout = "grid grid-cols-[20px_25px_1fr_80px_65px] md:grid-cols-[45px_45px_1fr_110px_90px_90px_110px_100px] items-center gap-1.5 md:gap-3";

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
      <div className="flex flex-col space-y-1">
        <div className="px-4 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between mx-1">
          <span className="font-black text-slate-800 text-[13px] uppercase tracking-tighter">{title}</span>
          {currentTime && <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">{currentTime}</span>}
        </div>
        <div className="bg-[#fcfdfe] border-y border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[25px_1fr_55px_65px] px-4 py-2 bg-slate-100/50 text-[9px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">
            <div>#</div>
            <div>종목명</div>
            <div className="text-right">등락</div>
            <div className="text-right">금액</div>
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
                <div key={`${title}-${stock.code}-${idx}`} className="grid grid-cols-[25px_1fr_55px_65px] items-center px-4 h-9 hover:bg-white transition-all group">
                  <div className="text-[10px] font-black text-slate-400">{idx + 1}</div>
                  <Link to={`/stock/${stock.code}`} className="text-[12px] font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                    {stock.name}
                  </Link>
                  <div className={`text-right text-[11px] font-black font-mono ${isUp ? 'text-rose-500' : 'text-indigo-600'}`}>
                    {isUp ? '+' : ''}{rate.toFixed(1)}%
                  </div>
                  <div className="text-right text-[11px] font-black text-slate-500 font-mono tracking-tighter opacity-80">
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f7fa]">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <nav className="flex items-center justify-between md:justify-start gap-1 px-1.5 md:px-4 py-2 md:py-3 overflow-x-auto no-scrollbar">
          {['급상승', '급하락', '거래량', '거래대금', '테마', '투자자별', '관심'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-5 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl transition-all whitespace-nowrap flex-1 md:flex-none font-black text-[10px] md:text-[13px]
                ${getTabColor(tab)}
                ${tab === '관심' ? 'md:hidden' : ''}`}
            >
              <span className={`md:block scale-75 md:scale-100 hidden`}>{categoryIcons[tab]}</span>
              <span>{tab}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === '테마' && (
          <aside className="hidden md:block w-64 border-r border-slate-200/60 overflow-y-auto shrink-0 p-3 no-scrollbar bg-[#f8fafc]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Market Themes</h3>
            <div className="space-y-0.5">
                {(allThemes || []).map((t: any) => (
                  <div key={t.name} onClick={() => setSelectedThemeId(t.name)}
                    className={`cursor-pointer px-4 py-1.5 rounded-xl transition-all border-2 ${selectedThemeId === t.name ? 'bg-white border-violet-500 shadow-sm scale-[1.01]' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-100'}`}>
                    <div className="flex justify-between items-center gap-2">
                      <span className={`font-black text-[13px] truncate ${selectedThemeId === t.name ? 'text-violet-600' : 'text-slate-600'}`}>{t.name}</span>
                      <span className={`text-[11px] font-black font-mono ${parseFloat(t.avgChangeRate || 0) > 0 ? 'text-rose-500' : 'text-indigo-600'}`}>{parseFloat(t.avgChangeRate || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <div className="w-full">
            {activeTab === '투자자별' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 py-2 md:p-4 bg-[#f8fafc]">
                {isLoadingInvestor && foreignStocks.length === 0 ? (
                  <div className="col-span-3 py-40 text-center text-slate-300 font-black uppercase animate-pulse italic">Synchronizing Data...</div>
                ) : (
                  <>
                    {renderInvestorColumn('외국인', foreignStocks)}
                    {renderInvestorColumn('기관', institutionStocks)}
                    {renderInvestorColumn('개인', individualStocks)}
                  </>
                )}
              </div>
            ) : (
              <div className="w-full bg-[#fcfdfe] min-h-[600px]">
                {activeTab === '테마' && (
                  <div className="md:hidden p-3 bg-slate-100/50 border-b border-slate-200 relative">
                    <button 
                      onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm flex justify-between items-center shadow-sm active:scale-[0.98] transition-all"
                    >
                      <span className="font-black tracking-tight flex items-center gap-2 text-violet-600">
                        <LayoutGrid size={14} /> {selectedThemeId}
                      </span>
                      <ChevronRight size={16} className={`transform transition-transform ${isThemeMenuOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isThemeMenuOpen && (
                      <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[350px] overflow-y-auto p-1 space-y-0.5 animate-in zoom-in-95 fade-in duration-200">
                        {(allThemes || []).map((t: any) => (
                          <div key={t.name} onClick={() => { setSelectedThemeId(t.name); setIsThemeMenuOpen(false); }}
                            className={`px-4 py-2.5 rounded-lg flex justify-between items-center active:bg-blue-50 ${selectedThemeId === t.name ? 'bg-blue-50 text-violet-600 font-black' : 'text-slate-600'}`}
                          >
                            <span className="text-xs font-bold">{t.name}</span>
                            <span className={`text-[10px] font-black font-mono ${parseFloat(t.avgChangeRate || 0) > 0 ? 'text-rose-500' : 'text-indigo-600'}`}>{parseFloat(t.avgChangeRate || 0).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`${gridLayout} px-4 md:px-8 py-2.5 bg-slate-100/50 border-b border-slate-200 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                    <div className="text-center">#</div>
                    <div className="text-center"></div>
                    <div>Stock</div>
                    <div className="text-right">Price</div>
                    <div className="text-right hidden md:block">Chg</div>
                    <div className="text-right">Rate</div>
                    <div className="text-right hidden md:block">Value</div>
                    <div className="text-right hidden md:block">Vol</div>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {activeTab === '관심' && !user ? (
                    <div className="py-40 text-center flex flex-col items-center gap-6 px-6">
                       <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner"><Heart size={32} /></div>
                       <button onClick={onLoginClick} className="px-8 py-3 bg-slate-900 rounded-xl text-[12px] font-black text-white shadow-lg active:scale-95 uppercase tracking-widest">Sign In</button>
                    </div>
                  ) : activeTab === '관심' && displayStocks.length === 0 ? (
                    <div className="py-40 text-center flex flex-col items-center gap-6 px-6">
                       <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner"><Heart size={32} /></div>
                       <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Portfolio Empty</p>
                    </div>
                  ) : (
                    ((isLoadingStocks && !['테마', '관심'].includes(activeTab)) || (isLoadingThemeStocks && activeTab === '테마')) && rankingStocks.length === 0 ? (
                      <div className="py-40 text-center font-black text-slate-200 text-xl uppercase animate-pulse italic">Loading...</div>
                    ) : (
                      (displayStocks || []).map((stock: any, idx: number) => {
                        const rate = parseFloat(String(stock.changeRate)) || 0;
                        const isUp = rate > 0;
                        const isUpper = !!stock.isUpperLimit;
                        const isLower = !!stock.isLowerLimit;
                        const changeValue = stock.change || (Math.round(stock.price * (Math.abs(rate) / 100)));
                        
                        return (
                          <div key={`${activeTab}-${stock.code}-${idx}`} className={`${gridLayout} px-4 md:px-8 h-[38px] md:h-[44px] hover:bg-white transition-all group cursor-pointer relative active:bg-blue-50/30 border-b border-slate-50/50`} onClick={() => navigate(`/stock/${stock.code}`)}>
                             <div className="text-[10px] md:text-[12px] font-black text-slate-400/60 font-mono tracking-tighter">{idx + 1}</div>
                             <div className="flex justify-center" onClick={(e) => { e.stopPropagation(); onFavoriteToggle(stock.code); }}>
                              <Heart size={14} className={`transition-all duration-300 ${favoritedStocks.includes(stock.code) ? 'text-rose-500 fill-rose-500' : 'text-slate-200 hover:text-rose-300'}`} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-black text-[13px] md:text-[15px] text-slate-700 truncate tracking-tight group-hover:text-indigo-600 transition-colors">{stock.name}</span>
                                <span className="text-[8px] md:text-[9px] font-black text-slate-400 font-mono uppercase leading-none opacity-70">{stock.code}</span>
                            </div>
                            <div className="text-right text-[12px] md:text-[14px] font-black text-slate-800 font-mono tracking-tighter">{Number(stock.price || 0).toLocaleString()}</div>
                            
                            <div className={`hidden md:block text-right text-[13px] font-black font-mono tracking-tighter ${isUp ? 'text-rose-500' : 'text-indigo-600'}`}>
                              {isUpper ? (
                                <span className="bg-rose-500 text-white text-[8px] px-1 rounded-sm mr-0.5">상</span>
                              ) : isLower ? (
                                <span className="bg-indigo-600 text-white text-[8px] px-1 rounded-sm mr-0.5">하</span>
                              ) : (
                                <span className="mr-0.5">{isUp ? '▲' : '▼'}</span>
                              )}
                              {Number(Math.abs(changeValue)).toLocaleString()}
                            </div>

                            <div className={`text-right text-[11px] md:text-[14px] font-black font-mono tracking-tighter ${isUp ? 'text-rose-500' : 'text-indigo-600'}`}>{isUp ? '+' : ''}{rate.toFixed(1)}%</div>
                            
                            <div className="text-right text-[11px] font-black text-slate-500 font-mono tracking-tighter hidden md:block uppercase opacity-80">
                              {(() => {
                                const val = parseInt(stock.tradeValue || '0');
                                if (val >= 1000000000000) return `${(val / 1000000000000).toFixed(1)}T`;
                                return `${(val / 100000000).toFixed(0)}B`;
                              })()}
                            </div>
                            <div className="text-right text-[10px] md:text-[12px] font-black text-slate-400/80 font-mono tracking-tighter hidden md:block uppercase opacity-60">
                              {stock.volume >= 100000000 
                                ? `${(stock.volume / 100000000).toFixed(1)}M` 
                                : stock.volume >= 10000 
                                  ? `${(stock.volume / 10000).toFixed(0)}K`
                                  : Number(stock.volume).toLocaleString()}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
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
