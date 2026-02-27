import { useState, useEffect } from 'react';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = ({ favoritedStocks, onFavoriteToggle }: any) => {
  const [activeTab, setActiveTab] = useState(() => {
    // sessionStorage는 브라우저 탭을 닫으면 초기화되므로 '접속 시' 기준에 적합함
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
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false); // 드롭다운 상태 추가
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
          // 저장된 테마가 없거나 목록에 없는 경우 첫 번째 테마 선택
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
    '급상승': <Flame size={16} className="text-[#F04452]" />,
    '급하락': <ArrowDownCircle size={16} className="text-[#3182F6]" />,
    '거래량': <BarChart3 size={16} className="text-[#2ECC71]" />,
    '거래대금': <Coins size={16} className="text-[#F1C40F]" />,
    '테마': <LayoutGrid size={16} className="text-[#9B59B6]" />,
    '투자자별': <Users size={16} className="text-[#3498DB]" />,
  };

  const gridLayout = "grid grid-cols-[16px_20px_104px_53px_50px_53px_50px_50px] md:grid-cols-[45px_60px_0.5fr_110px_90px_90px_100px_90px] items-center gap-1";

  let displayStocks: any[] = [];
  if (activeTab === '테마') displayStocks = selectedThemeStocks;
  else if (['급상승', '급하락', '거래량', '거래대금'].includes(activeTab)) displayStocks = rankingStocks;

  const renderInvestorColumn = (title: string, stocks: any[]) => {
    let timeKey: 'foreign' | 'institution' | 'individual' = 'foreign';
    if (title === '기관') timeKey = 'institution';
    if (title === '개인') timeKey = 'individual';
    const currentTime = investorUpdateTimes[timeKey];

    return (
      <div className="flex flex-col space-y-1 min-h-[500px]">
        <div className="sticky top-0 z-20 px-3 py-1.5 bg-[#1C1E23] rounded-xl text-center font-bold text-[13px] text-slate-300 border border-white/5 flex flex-col items-center justify-center gap-0">
          <span>{title}</span>
          {currentTime && <span className="text-[9px] text-slate-500 font-normal mt-[-2px]">{currentTime}</span>}
        </div>
        <div className="sticky top-[42px] z-10 grid grid-cols-[25px_1fr_55px_65px] px-2 py-1 text-[10px] font-bold text-slate-600 uppercase border-b border-white/5 bg-[#0E1013] h-8 items-center">
          <div>#</div>
          <div>종목명</div>
          <div className="text-right">등락률</div>
          <div className="text-right">대금</div>
        </div>
        <div className="space-y-0">
          {(stocks || []).map((stock: any, idx: number) => {
            const rawRate = typeof stock.changeRate === 'string' ? parseFloat(stock.changeRate.replace('%', '')) : stock.changeRate;
            const rate = isNaN(rawRate) ? 0 : rawRate;
            const isUp = rate > 0;
            // 거래대금 표시 최적화 (조, 억, 만 단위 모두 대응)
            const rawValue = stock.tradeValue || '';
            const displayValue = (typeof rawValue === 'string' && (rawValue.includes('조') || rawValue.includes('억') || rawValue.includes('만'))) 
              ? rawValue 
              : (parseInt(rawValue) > 0 ? `${(parseInt(rawValue) / 100000000).toFixed(0)}억` : '---');

            return (
              <div key={`${title}-${stock.code}-${idx}`} className="grid grid-cols-[25px_1fr_55px_65px] items-center px-2 py-0 hover:bg-[#1C1E23] rounded-lg transition-all group h-8">
                <div className="text-[13px] font-bold text-slate-500">{idx + 1}</div>
                <Link to={`/stock/${stock.code}`} className="text-xs md:text-[14px] font-bold text-slate-200 truncate group-hover:text-white">
                  {stock.name}
                </Link>
                <div className={`text-right text-xs md:text-[13px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                  {isUp ? '+' : ''}{rate.toFixed(2)}%
                </div>
                <div className="text-right text-xs md:text-[13px] font-bold text-slate-500 font-mono">
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
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${investorTab === 'buy' ? 'bg-[#F04452] text-white' : 'bg-[#1C1E23] text-slate-400'}`}>
            순매수
          </button>
          <button onClick={() => setInvestorTab('sell')}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${investorTab === 'sell' ? 'bg-[#3182F6] text-white' : 'bg-[#1C1E23] text-slate-400'}`}>
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
              (allThemes || []).map((t: any) => (
                <div key={t.name} onClick={() => setSelectedThemeId(t.name)}
                  className={`cursor-pointer px-3 py-1.5 rounded-xl transition-all mb-1 ${selectedThemeId === t.name ? 'bg-[#1C1E23]' : 'hover:bg-white/5'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-[13px] truncate max-w-[110px] ${selectedThemeId === t.name ? 'text-white' : 'text-slate-400'}`}>{t.name}</span>
                    <span className={`text-[12px] font-bold ${parseFloat(t.avgChangeRate || 0) > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{parseFloat(t.avgChangeRate || 0).toFixed(2)}%</span>
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
                  <div className="md:hidden p-2 mb-1 relative">
                    {/* 커스텀 드롭다운 버튼 */}
                    <button 
                      onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                      className="w-full bg-[#1C1E23] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm flex justify-between items-center"
                    >
                      <span className="font-bold">
                        {selectedThemeId} ({parseFloat(allThemes.find(t => t.name === selectedThemeId)?.avgChangeRate || 0).toFixed(2)}%)
                      </span>
                      <ChevronRight size={16} className={`transform transition-transform ${isThemeMenuOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* 커스텀 드롭다운 리스트 */}
                    {isThemeMenuOpen && (
                      <div 
                        className="absolute top-full left-2 right-2 mt-1 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl z-50 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                      >
                        {(allThemes || []).map((t: any) => (
                          <div 
                            key={t.name}
                            onClick={() => {
                              setSelectedThemeId(t.name);
                              setIsThemeMenuOpen(false);
                            }}
                            className={`px-4 py-3 border-b border-white/5 last:border-0 flex justify-between items-center active:bg-white/5 ${selectedThemeId === t.name ? 'bg-blue-600/20' : ''}`}
                          >
                            <span className={`text-sm ${selectedThemeId === t.name ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>{t.name}</span>
                            <span className={`text-xs font-bold ${parseFloat(t.avgChangeRate || 0) > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                              {parseFloat(t.avgChangeRate || 0).toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="px-2 py-2">
                  <div className={`${gridLayout} pb-2 border-b border-white/5 text-[11px] font-bold text-slate-600 uppercase h-8 items-center`}>
                    <div className="text-center">#</div>
                    <div className="text-center"></div>
                    <div>종목명</div>
                    <div className="text-right">현재가</div>
                    <div className="text-right">전일비</div>
                    <div className="text-right">등락률</div>
                    <div className="text-right">거래대금</div>
                    <div className="text-right">거래량</div>
                  </div>
                
                <div className="min-h-[600px] mt-0.5">
                  {((isLoadingStocks && activeTab !== '테마') || (isLoadingThemeStocks && activeTab === '테마')) && rankingStocks.length === 0 ? (
                    <div className="text-center text-slate-400 py-20">데이터 로딩 중...</div>
                  ) : (
                    <div className="space-y-0">
                      {(displayStocks || []).map((stock: any, idx: number) => {
                        const isUp = (stock.changeRate || 0) > 0;
                        const isUpper = !!stock.isUpperLimit;
                        const isLower = !!stock.isLowerLimit;
                        
                        // 전일비가 0일 경우 등락률 기반 추산 (네이버가 값을 안 줄 경우 대비)
                        const changeValue = stock.change || (Math.round(stock.price * (Math.abs(stock.changeRate) / 100)));
                        
                        return (
                          <div key={`${activeTab}-${stock.code}-${idx}`} className={`${gridLayout} py-0 rounded-2xl hover:bg-[#1C1E23] transition-all group h-9`}>
                             <div className="text-center text-[13px] font-bold text-slate-500">{idx + 1}</div>
                             <div className="flex justify-center">
                              <Heart size={14} onClick={() => onFavoriteToggle(stock.code)} className={`cursor-pointer ${favoritedStocks.includes(stock.code) ? 'text-[#F04452]' : 'text-slate-800'}`} />
                            </div>
                            <Link to={`/stock/${stock.code}`} className="font-bold text-xs md:text-[15px] text-slate-100 truncate px-0 group-hover:text-white">{stock.name}</Link>
                            <div className="text-right text-xs md:text-[14px] font-bold text-slate-200 font-mono">{Number(stock.price || 0).toLocaleString()}</div>
                            <div className={`text-right text-[10px] md:text-[13px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                              {isUpper ? (
                                <span className="bg-[#F04452] text-white text-[9px] px-1 py-0.5 rounded-sm mr-1">상</span>
                              ) : isLower ? (
                                <span className="bg-[#3182F6] text-white text-[9px] px-1 py-0.5 rounded-sm mr-1">하</span>
                              ) : (
                                <span className="mr-0.5">{isUp ? '▲' : '▼'}</span>
                              )}
                              {Number(Math.abs(changeValue)).toLocaleString()}
                            </div>
                            <div className={`text-right text-xs md:text-[14px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>{isUp ? '+' : ''}{(stock.changeRate || 0).toFixed(2)}%</div>
                            <div className="text-right text-xs md:text-[14px] font-bold text-slate-500 font-mono truncate">{(parseInt(stock.tradeValue || '0') / 100000000).toFixed(0)}억</div>
                            <div className="text-right text-[10px] md:text-[14px] font-bold text-slate-500 font-mono whitespace-nowrap">
                              {stock.volume >= 100000000 
                                ? `${(stock.volume / 100000000).toFixed(1)}억` 
                                : stock.volume >= 10000 
                                  ? `${(stock.volume / 10000).toFixed(0)}만`
                                  : Number(stock.volume).toLocaleString()}
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
