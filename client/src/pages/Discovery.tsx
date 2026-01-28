import { Search, Zap, Globe, BarChart3, Trophy } from 'lucide-react';

const CATEGORIES = [
  { icon: <Zap size={18}/>, name: '급상승', color: 'from-red-500 to-orange-500' },
  { icon: <Globe size={18}/>, name: '해외주식', color: 'from-blue-500 to-cyan-500' },
  { icon: <BarChart3 size={18}/>, name: '배당주', color: 'from-green-500 to-emerald-500' },
  { icon: <Trophy size={18}/>, name: '수익률', color: 'from-purple-500 to-pink-500' },
];

const Discovery = () => {
  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto">
      <div className="p-4 md:p-10 pb-24 mx-auto">
        {/* 검색바 */}
        <div className="relative mb-12">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="어떤 종목이 궁금하세요?" 
            className="w-full bg-[#16191C] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 transition-all text-lg"
          />
        </div>

        {/* 스토리 섹션 */}
        <div className="flex gap-8 justify-center overflow-x-auto pb-10 scrollbar-hide">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="flex flex-col items-center gap-3 shrink-0 group cursor-pointer">
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${cat.color} group-hover:scale-110 transition-transform`}>
                <div className="w-full h-full rounded-full bg-[#0E1013] p-1">
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white">
                    {cat.icon}
                  </div>
                </div>
              </div>
              <span className="text-[13px] font-bold text-slate-400 group-hover:text-white">{cat.name}</span>
            </div>
          ))}
        </div>

        {/* 인기 검색어 카드 */}
        <div className="bg-[#16191C] rounded-[32px] p-8 border border-white/5">
          <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
            <Activity className="text-blue-500" size={20} /> 지금 많이 찾는 키워드
          </h3>
          <div className="flex flex-wrap gap-3">
            {['초전도체', '엔비디아 실적', '금리 결정', '비트코인 신고가', '애플 비전프로', '저PBR', 'CXL 반도체'].map((tag, i) => (
              <span 
                key={i} 
                className="px-6 py-3 bg-white/5 rounded-full text-[14px] font-medium text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-all"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 상단 헤더에 필요한 Activity 아이콘 추가 임포트 (위쪽에는 없으므로)
import { Activity } from 'lucide-react';

export default Discovery;