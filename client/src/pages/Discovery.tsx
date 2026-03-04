import { useState, useEffect } from 'react';
import { Search, Zap, Globe, BarChart3, Activity, ChevronRight, TrendingUp, Cpu, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { icon: <Zap size={20}/>, name: '급상승', color: 'from-rose-500 to-orange-500', desc: '현재 가장 뜨거운 종목' },
  { icon: <Globe size={20}/>, name: '해외주식', color: 'from-blue-500 to-indigo-500', desc: '글로벌 시장 트렌드' },
  { icon: <Coins size={20}/>, name: '배당주', color: 'from-emerald-500 to-teal-500', desc: '안정적인 수익 모델' },
  { icon: <Cpu size={20}/>, name: '기술주', color: 'from-purple-500 to-pink-500', desc: '미래 성장을 주도하는 기업' },
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
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    const timer = setTimeout(searchStocks, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="flex-1 h-full bg-[#f4f7fa] overflow-y-auto scroll-smooth no-scrollbar p-0">
      <div className="max-w-4xl mx-auto px-6 md:px-10 pb-48">
        {/* Search Header */}
        <div className="sticky top-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-md pt-8 md:pt-12 pb-4 px-1">
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
              {loading ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Search size={22} />}
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="종목명 또는 코드를 입력하세요" 
              className="w-full bg-white border-2 border-slate-200 rounded-[28px] py-5 md:py-6 pl-16 pr-8 text-slate-900 outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-600/5 transition-all text-base md:text-lg shadow-xl shadow-blue-900/5 font-bold placeholder:text-slate-300"
            />
          </div>

          {/* Real-time Results Popup */}
          {results.length > 0 && (
            <div className="mt-3 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="py-3 px-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Search Results</p>
                <button onClick={() => setResults([])} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Close</button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto overscroll-contain divide-y divide-slate-50">
                {results.map((stock) => (
                  <div key={stock.code} onClick={() => navigate(`/stock/${stock.code}`)}
                    className="flex items-center justify-between px-6 py-4 hover:bg-blue-50/50 cursor-pointer group transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-[15px] text-slate-800 font-black group-hover:text-blue-600 transition-colors tracking-tight">{stock.name}</span>
                      <span className="text-[10px] text-slate-400 font-black font-mono uppercase tracking-tighter">{stock.code} · {stock.market}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ChevronRight size={16} strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {searchTerm.length === 0 ? (
          <>
            {/* Horizontal Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {CATEGORIES.map((cat, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500/20 transition-all group cursor-pointer active:scale-95">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </div>
                  <h4 className="text-[15px] font-black text-slate-800 mb-1">{cat.name}</h4>
                  <p className="text-[11px] text-slate-400 font-bold leading-tight">{cat.desc}</p>
                </div>
              ))}
            </div>

            {/* Trending Keywords */}
            <div className="mt-8 bg-white rounded-[32px] p-8 md:p-10 border border-slate-200 shadow-sm">
              <h3 className="text-xs md:text-sm font-black text-slate-400 mb-8 uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="text-blue-600" size={16} /> Popular Keywords
              </h3>
              <div className="flex flex-wrap gap-3">
                {['초전도체', '엔비디아', '미국 대선', '비트코인', 'AI반도체', '저PBR', 'CXL', '금리 인하'].map((tag, i) => (
                  <span key={i} onClick={() => setSearchTerm(tag)}
                    className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-black text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 cursor-pointer transition-all shadow-sm active:scale-95"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Promo Card */}
            <div className="mt-8 p-8 md:p-12 bg-gradient-to-br from-slate-900 to-blue-900 rounded-[40px] relative overflow-hidden group shadow-2xl">
              <div className="relative z-10 text-white max-w-md">
                <h4 className="text-2xl md:text-3xl font-black mb-4 tracking-tighter leading-tight flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl"><TrendingUp size={24} /></div>
                  최고의 투자 기회를 <br/> 발견해보세요
                </h4>
                <p className="text-blue-100/60 text-sm md:text-base mb-10 leading-relaxed font-medium italic">실시간 시장 데이터를 분석하여 가장 유망한 종목을 실시간으로 추천해드립니다.</p>
                <button onClick={() => navigate('/recommendation')}
                  className="px-10 py-4 bg-white text-blue-900 rounded-[20px] font-black text-sm hover:bg-blue-50 transition-all shadow-xl active:scale-95 uppercase tracking-widest"
                >
                  Get Recommendations
                </button>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] text-white/5 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-1000">
                <BarChart3 size={320} />
              </div>
            </div>
          </>
        ) : (
          /* Empty Search Info */
          results.length === 0 && !loading && (
            <div className="mt-12 text-center py-24 md:py-32 bg-white rounded-[40px] border-2 border-slate-200 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Search size={40} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">No Results Found</h3>
              <p className="text-slate-400 text-sm font-bold">' {searchTerm} ' 에 대한 검색 결과가 없습니다.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Discovery;
