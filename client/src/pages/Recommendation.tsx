import { Flame, ChevronRight, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RECOMMEND_DATA = [
  { rank: '01', name: '삼성전자', code: '005930', reason: '외국인이 5일 연속 집중 매수 중', price: 78200, change: 1.2, tags: ['우량주', '반도체'], hot: true },
  { rank: '02', name: '현대차', code: '005380', reason: '역대급 실적 발표가 기대돼요', price: 245000, change: 3.5, tags: ['자동차', '배당'], hot: true },
  { rank: '03', name: 'SK하이닉스', code: '000660', reason: 'HBM 공급 계약 소식이 있어요', price: 182000, change: -0.5, tags: ['AI반도체'], hot: false },
  { rank: '04', name: '에코프로', code: '086520', reason: '리튬 가격 반등 수혜가 예상돼요', price: 612000, change: 2.1, tags: ['2차전지'], hot: false },
];

const Recommendation = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 h-full bg-[#edf0f3] overflow-y-auto scroll-smooth no-scrollbar p-0">
      <div className="max-w-4xl mx-auto md:px-10 pb-32">
        {/* Header Section - Mobile Compact */}
        <div className="flex flex-col mt-4 md:mt-12 mb-6 md:mb-10 px-4 md:px-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20 text-white">
              <Flame size={20} fill="currentColor" />
            </div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Daily Picks</h2>
          </div>
          <p className="text-slate-400 font-bold text-xs md:text-sm ml-1">AI와 전문가가 선정한 오늘의 핵심 종목</p>
        </div>

        {/* Recommend Cards - Mobile Compact */}
        <div className="grid gap-3 md:gap-6 px-4 md:px-0">
          {RECOMMEND_DATA.map((item) => (
            <div 
              key={item.rank} 
              onClick={() => navigate(`/stock/${item.code}`)}
              className="group relative flex items-center justify-between bg-white p-4 md:p-8 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 md:gap-10 flex-1 min-w-0">
                {/* Rank Number */}
                <span className="text-2xl md:text-5xl font-black italic text-slate-100 group-hover:text-blue-500/10 transition-colors leading-none tracking-tighter shrink-0">
                {item.rank}
                </span>
                
                {/* Stock Info */}
                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] md:text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate tracking-tight">{item.name}</h3>
                    <div className="flex gap-1">
                      {item.tags.slice(0, 1).map(tag => (
                        <span key={tag} className="text-[8px] md:text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-slate-100 font-black uppercase">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap size={12} className="text-blue-500" fill="currentColor" />
                    <p className="text-[12px] md:text-[15px] text-slate-500 font-bold truncate">{item.reason}</p>
                  </div>
                  
                  {/* Mobile Price */}
                  <div className="flex items-baseline gap-2.5 mt-1.5 md:hidden">
                    <span className="text-base font-black text-slate-900 font-mono tracking-tighter">{item.price.toLocaleString()}</span>
                    <span className={`text-[11px] font-black font-mono ${item.change > 0 ? 'text-rose-500' : 'text-blue-600'}`}>
                      {item.change > 0 ? '▲' : '▼'}{Math.abs(item.change)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Price */}
              <div className="hidden md:flex flex-col items-end text-right px-10 shrink-0 border-r border-slate-100 mr-6">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{item.price.toLocaleString()}원</div>
                <div className={`text-base font-black font-mono flex items-center gap-1 ${item.change > 0 ? 'text-rose-500' : 'text-blue-600'}`}>
                  {item.change > 0 ? <TrendingUp size={16}/> : <BarChart3 size={16}/>}
                  {item.change > 0 ? '+' : ''}{item.change}%
                </div>
              </div>

              {/* Arrow */}
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0">
                <ChevronRight size={20} strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 mx-2 md:mx-0 p-6 md:p-8 bg-white/50 rounded-[24px] md:rounded-[32px] border border-slate-200 border-dashed">
          <p className="text-[10px] md:text-sm text-slate-400 leading-relaxed font-bold italic">
            * 투자 결과에 대한 법적 책임은 사용자 본인에게 있습니다. 신중한 투자 판단을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Recommendation;
