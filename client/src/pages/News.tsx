import { Newspaper, Bell, Flame } from 'lucide-react';

const NEWS_DATA = [
  { id: 1, title: '"엔비디아 잡아라" 전 세계 반도체 전쟁 가속화... 삼성의 선택은?', time: '10분 전', category: '경제', isHot: true },
  { id: 2, title: '정부, 저PBR 기업 밸류업 프로그램 세부안 발표에 금융주 들썩', time: '1시간 전', category: '증시', isHot: false },
  { id: 3, title: '리튬 가격 하락세 멈췄나? 2차전지 관련주 일제히 반등 성공', time: '2시간 전', category: '산업', isHot: true },
  { id: 4, title: '금리 인하 시점 안개속... 미 연준 의장 "지표 더 지켜봐야"', time: '3시간 전', category: '해외', isHot: false },
  { id: 5, title: 'K-방산, 중동 이어 유럽 시장 공략 박차... 연이은 수출 잭팟', time: '4시간 전', category: '산업', isHot: false },
  { id: 6, title: 'AI 열풍에 전력 수요 폭증... 변압기·전선 관련주 연일 신고가', time: '5시간 전', category: '경제', isHot: true },
];

const News = () => {
  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto scroll-smooth hide-scrollbar">
      <div className="max-w-3xl px-4 md:px-10 pb-32">
        {/* 헤더 섹션 */}
        <div className="flex items-center justify-between mt-6 md:mt-10 mb-8 px-1">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <Newspaper className="text-blue-500" size={20} />
            </div>
            실시간 뉴스
          </h2>
          <button className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors active:scale-90">
            <Bell size={20} />
          </button>
        </div>

        {/* 뉴스 리스트 */}
        <div className="space-y-0">
          {NEWS_DATA.map((news) => (
            <div 
              key={news.id} 
              className="group flex flex-col py-2.5 md:py-3.5 px-1 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-all cursor-pointer active:bg-white/5"
            >
              <div className="flex items-center gap-2 mb-1">
                {news.isHot && (
                  <div className="flex items-center gap-0.5 bg-red-500/10 px-1 py-0.5 rounded-sm">
                    <Flame size={10} className="text-red-500" />
                    <span className="text-[9px] font-black text-red-500 uppercase">Hot</span>
                  </div>
                )}
                <span className="text-[10px] md:text-[11px] font-bold text-slate-600">
                  {news.category} <span className="mx-0.5 text-slate-800">·</span> {news.time}
                </span>
              </div>
              <h3 className="text-[14px] md:text-[16px] font-bold text-slate-300 group-hover:text-blue-400 transition-colors leading-tight break-keep line-clamp-2">
                {news.title}
              </h3>
            </div>
          ))}
        </div>

        {/* 더보기 안내 */}
        <div className="mt-8 px-1 py-10 text-center border-t border-white/5">
          <p className="text-xs text-slate-600 italic">
            실시간 뉴스는 계속 업데이트됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default News;