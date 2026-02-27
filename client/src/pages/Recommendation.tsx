import { Flame, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RECOMMEND_DATA = [
  { rank: '01', name: '삼성전자', code: '005930', reason: '외국인이 5일 연속 집중 매수 중', price: 78200, change: 1.2, tags: ['우량주', '반도체'] },
  { rank: '02', name: '현대차', code: '005380', reason: '역대급 실적 발표가 기대돼요', price: 245000, change: 3.5, tags: ['자동차', '배당'] },
  { rank: '03', name: 'SK하이닉스', code: '000660', reason: 'HBM 공급 계약 소식이 있어요', price: 182000, change: -0.5, tags: ['AI반도체'] },
  { rank: '04', name: '에코프로', code: '086520', reason: '리튬 가격 반등 수혜가 예상돼요', price: 612000, change: 2.1, tags: ['2차전지'] },
];

const Recommendation = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto scroll-smooth hide-scrollbar">
      <div className="max-w-3xl px-4 md:px-10 pb-32">
        <div className="flex items-center justify-between mt-6 md:mt-10 mb-8 px-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-orange-500/20 rounded-xl">
              <Flame className="text-orange-500" size={20} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white">오늘의 추천</h2>
          </div>
          <span className="text-xs md:text-sm text-slate-500 font-medium cursor-pointer hover:text-slate-300 transition-colors">전체보기</span>
        </div>

        <div className="grid gap-3 md:gap-4">
          {RECOMMEND_DATA.map((item) => (
            <div 
              key={item.rank} 
              onClick={() => navigate(`/stock/${item.code}`)}
              className="group flex items-center justify-between bg-[#16191C] p-4 md:p-5 rounded-[24px] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all cursor-pointer shadow-lg active:scale-[0.98]"
            >
              {/* 순위 (좌측 고정) */}
              <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                <span className="text-xl md:text-2xl font-black italic text-blue-500/20 group-hover:text-blue-500/40 transition-colors shrink-0">
                  {item.rank}
                </span>
                
                {/* 종목 정보 */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[15px] md:text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">{item.name}</h3>
                    <div className="flex gap-1">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[9px] md:text-[10px] px-1.5 py-0.5 bg-white/5 text-slate-500 rounded border border-white/5 font-medium">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] md:text-[13px] text-blue-400/80 font-medium truncate">{item.reason}</p>
                  
                  {/* 모바일 전용 가격 정보 */}
                  <div className="flex items-baseline gap-2 mt-1 md:hidden">
                    <span className="text-sm font-bold text-white">{item.price.toLocaleString()}원</span>
                    <span className={`text-[11px] font-bold ${item.change > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </div>
                </div>
              </div>

              {/* PC 전용 가격 정보 */}
              <div className="hidden md:flex flex-col items-end text-right px-6 shrink-0 border-r border-white/5 mr-4">
                <div className="text-base font-bold text-white">{item.price.toLocaleString()}원</div>
                <div className={`text-sm font-bold ${item.change > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </div>
              </div>

              {/* 화살표 */}
              <ChevronRight size={18} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          ))}
        </div>

        {/* 안내 문구 (좌측 정렬 및 모바일 최적화) */}
        <div className="mt-10 px-1 py-4 bg-transparent border-t border-white/5 text-left">
          <p className="text-[10px] md:text-xs text-slate-600 leading-normal italic whitespace-nowrap overflow-hidden text-ellipsis">
            * 추천 종목은 AI 알고리즘과 시장 수급 데이터를 기반으로 선정됩니다.
          </p>
          <p className="text-[10px] md:text-xs text-slate-600 leading-normal italic mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            * 투자의 책임은 본인에게 있으며, 신중한 판단을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Recommendation;