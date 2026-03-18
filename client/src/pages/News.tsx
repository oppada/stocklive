import { Newspaper, Bell, ChevronRight } from 'lucide-react';

const NEWS_DATA = [
  { id: 1, title: '"엔비디아 잡아라" 전 세계 반도체 전쟁 가속화... 삼성의 선택은?', time: '10분 전', category: '경제', isHot: true, source: 'StockMate News' },
  { id: 2, title: '정부, 저PBR 기업 밸류업 프로그램 세부안 발표에 금융주 들썩', time: '1시간 전', category: '증시', isHot: false, source: '증권연합' },
  { id: 3, title: '리튬 가격 하락세 멈췄나? 2차전지 관련주 일제히 반등 성공', time: '2시간 전', category: '산업', isHot: true, source: '에너지데일리' },
  { id: 4, title: '금리 인하 시점 안개속... 미 연준 의장 "지표 더 지켜봐야"', time: '3시간 전', category: '해외', isHot: false, source: 'Global Times' },
  { id: 5, title: 'K-방산, 중동 이어 유럽 시장 공략 박차... 연이은 수출 잭팟', time: '4시간 전', category: '산업', isHot: false, source: '국방뉴스' },
  { id: 6, title: 'AI 열풍에 전력 수요 폭증... 변압기·전선 관련주 연일 신고가', time: '5시간 전', category: '경제', isHot: true, source: 'IT World' },
];

const News = () => {
  return (
    <div className="flex-1 h-full bg-[#f8fafc] overflow-y-auto scroll-smooth no-scrollbar p-0">
      {/* Container - 추천페이지와 동일한 px-4 적용 */}
      <div className="max-w-4xl mx-auto px-4 md:px-10 pb-32">
        {/* Header Section */}
        <div className="flex items-center justify-between mt-6 md:mt-12 mb-8 px-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20 text-white">
                <Newspaper size={20} fill="currentColor" />
                </div>
                <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase">Market Feed</h2>
            </div>
            <p className="text-slate-400 font-bold text-xs md:text-sm ml-1">시장을 움직이는 실시간 핵심 이슈</p>
          </div>
          <button className="p-2.5 bg-white border border-slate-300 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm active:scale-90 transition-all">
            <Bell size={20} />
          </button>
        </div>

        {/* Categories Bar - Compact */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar px-1 md:px-0">
            {['전체', '증시', '산업', '경제', '해외', '속보'].map((cat, i) => (
                <button key={i} className={`px-5 py-2 rounded-full text-[11px] md:text-[13px] font-black whitespace-nowrap transition-all border-2 ${i === 0 ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400'}`}>
                    {cat}
                </button>
            ))}
        </div>

        {/* News Grid - 추천페이지 카드 여백 스타일 적용 */}
        <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-300 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {NEWS_DATA.map((news) => (
              <div 
                key={news.id} 
                className="group flex items-center gap-3 md:gap-4 px-4 md:px-6 h-14 md:h-16 hover:bg-slate-50 transition-all cursor-pointer active:bg-indigo-50/30"
              >
                {/* Hot Badge */}
                <div className="w-8 shrink-0 flex justify-center">
                    {news.isHot ? (
                        <div className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">Hot</div>
                    ) : (
                        <div className="text-[9px] font-black text-slate-200 uppercase tracking-tighter italic">News</div>
                    )}
                </div>

                {/* Title */}
                <h3 className="flex-1 text-[13px] md:text-[15px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
                  {news.title}
                </h3>

                {/* Meta Info */}
                <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-tighter">{news.source}</span>
                    <span className="text-[10px] font-black text-slate-300 whitespace-nowrap">{news.time}</span>
                </div>

                {/* Link Arrow */}
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                    <ChevronRight size={14} strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 px-4 py-12 text-center border-t border-slate-300/60 md:mx-0">
          <p className="text-[10px] text-slate-400 font-bold italic opacity-60 uppercase tracking-widest">
            Continuous update via StockMate Global Engine
          </p>
        </div>
      </div>
    </div>
  );
};

export default News;
