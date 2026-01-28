import { Flame, ChevronRight } from 'lucide-react';

const RECOMMEND_DATA = [
  { rank: '01', name: '삼성전자', reason: '외국인이 5일 연속 집중 매수 중', price: 78200, change: 1.2, tags: ['우량주', '반도체'] },
  { rank: '02', name: '현대차', reason: '역대급 실적 발표가 기대돼요', price: 245000, change: 3.5, tags: ['자동차', '배당'] },
  { rank: '03', name: 'SK하이닉스', reason: 'HBM 공급 계약 소식이 있어요', price: 182000, change: -0.5, tags: ['AI반도체'] },
  { rank: '04', name: '에코프로', reason: '리튬 가격 반등 수혜가 예상돼요', price: 612000, change: 2.1, tags: ['2차전지'] },
];

const Recommendation = () => {
  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto scrollbar-hide">
      <div className="p-4 md:p-10 pb-24 mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Flame className="text-orange-500" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">오늘의 추천</h2>
          </div>
          <span className="text-sm text-slate-500 cursor-pointer hover:text-slate-300">전체보기</span>
        </div>

        <div className="grid gap-4">
          {RECOMMEND_DATA.map((item) => (
            <div key={item.rank} className="group relative bg-[#16191C] p-5 rounded-[24px] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <span className="text-2xl font-black italic text-blue-500/30 group-hover:text-blue-500 transition-colors">
                    {item.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[17px] font-bold text-white">{item.name}</h3>
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-slate-400 rounded">#{tag}</span>
                      ))}
                    </div>
                    <p className="text-[13px] text-blue-400 font-medium">{item.reason}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className="text-[16px] font-bold text-white">{item.price.toLocaleString()}원</div>
                    <div className={`text-[12px] font-bold ${item.change > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recommendation;