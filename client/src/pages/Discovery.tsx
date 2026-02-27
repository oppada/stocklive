import { useState, useEffect } from 'react';
import { Search, Zap, Globe, BarChart3, Trophy, Activity, ChevronRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { icon: <Zap size={18}/>, name: '급상승', color: 'from-red-500 to-orange-500' },
  { icon: <Globe size={18}/>, name: '해외주식', color: 'from-blue-500 to-cyan-500' },
  { icon: <BarChart3 size={18}/>, name: '배당주', color: 'from-green-500 to-emerald-500' },
  { icon: <Trophy size={18}/>, name: '수익률', color: 'from-purple-500 to-pink-500' },
];

const Discovery = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchStocks = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchStocks, 300); // 300ms 디바운싱
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStockClick = (code: string) => {
    navigate(`/stock/${code}`);
  };

  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto scroll-smooth hide-scrollbar">
      <div className="max-w-2xl mx-auto px-4 md:px-10 pb-32">
        {/* 검색 섹션 (상단 고정) */}
        <div className="sticky top-0 z-50 bg-[#0E1013] pt-4 md:pt-10 pb-2">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              {loading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Search size={18} />}
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="어떤 종목이 궁금하세요?" 
              className="w-full bg-[#16191C] border border-white/10 rounded-xl py-3.5 md:py-5 pl-12 pr-6 text-white outline-none focus:border-blue-500/50 transition-all text-sm md:text-base shadow-2xl"
            />
          </div>

          {/* 검색 결과 레이어 */}
          {results.length > 0 && (
            <div className="mt-2 bg-[#1A1D21] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="py-2 px-4 border-b border-white/5 bg-white/[0.04] flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">검색 결과 {results.length}건</p>
                <button onClick={() => setResults([])} className="text-[10px] text-blue-500 font-bold hover:underline">닫기</button>
              </div>
              <div className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto overscroll-contain">
                {results.map((stock) => (
                  <div 
                    key={stock.code}
                    onClick={() => handleStockClick(stock.code)}
                    className="flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer border-b border-white/[0.02] last:border-0 group active:bg-white/10"
                  >
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm md:text-[14px] text-white font-bold group-hover:text-blue-400 transition-colors">{stock.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{stock.code} · {stock.market}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-800 group-hover:text-blue-500 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {searchTerm.length === 0 ? (
          <>
            {/* 스토리 섹션 */}
            <div className="flex gap-4 md:gap-6 justify-center overflow-x-auto py-6 md:py-10 scrollbar-hide">
              {CATEGORIES.map((cat, i) => (
                <div key={i} className="flex flex-col items-center gap-2 md:gap-3 shrink-0 group cursor-pointer">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full p-[2px] bg-gradient-to-tr ${cat.color} group-hover:scale-110 transition-transform shadow-lg`}>
                    <div className="w-full h-full rounded-full bg-[#0E1013] p-0.5 md:p-1">
                      <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white">
                        <span className="scale-90 md:scale-100">{cat.icon}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] md:text-[13px] font-bold text-slate-400 group-hover:text-white">{cat.name}</span>
                </div>
              ))}
            </div>

            {/* 인기 검색어 카드 */}
            <div className="bg-[#16191C] rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-white/5 shadow-xl">
              <h3 className="text-sm md:text-lg font-bold text-white mb-5 md:mb-8 flex items-center gap-2">
                <Activity className="text-blue-500" size={18} /> 지금 많이 찾는 키워드
              </h3>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {['초전도체', '엔비디아', '금리', '비트코인', '애플', '저PBR', 'CXL'].map((tag, i) => (
                  <span 
                    key={i} 
                    onClick={() => setSearchTerm(tag)}
                    className="px-4 py-2 md:px-6 md:py-3 bg-white/5 rounded-full text-xs md:text-sm font-medium text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-all border border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 오늘의 추천 종목 카드 */}
            <div className="mt-6 md:mt-8 p-6 md:p-8 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[24px] md:rounded-[32px] border border-blue-500/10 relative overflow-hidden group min-h-[160px] md:min-h-[200px]">
              <div className="relative z-10">
                <h4 className="text-sm md:text-lg font-bold mb-1 md:mb-2 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" /> 오늘의 추천 종목을 확인해보세요
                </h4>
                <p className="text-slate-400 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed">시장의 흐름을 가장 빠르게 캐치합니다.</p>
                <button 
                  onClick={() => navigate('/')}
                  className="px-5 py-2 md:px-6 md:py-2.5 bg-blue-600 text-white rounded-full font-bold text-xs md:text-sm hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                >
                  홈으로 가기
                </button>
              </div>
              <div className="absolute right-[-10px] bottom-[-10px] md:right-[-20px] md:bottom-[-20px] text-blue-500/10 rotate-12 transition-transform group-hover:scale-110">
                <BarChart3 size={120} />
              </div>
            </div>
          </>
        ) : (
          /* 검색 결과 안내 (결과가 없을 때) */
          results.length === 0 && !loading && (
            <div className="text-center py-16 md:py-20 bg-[#16191C] rounded-[24px] md:rounded-[32px] border border-white/5 border-dashed">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-700" />
              </div>
              <p className="text-slate-400 font-bold text-sm md:text-base">' {searchTerm} ' 에 대한 검색 결과가 없습니다.</p>
              <p className="text-slate-500 text-[11px] md:text-sm mt-1">종목명이나 종목코드를 확인해주세요.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Discovery;