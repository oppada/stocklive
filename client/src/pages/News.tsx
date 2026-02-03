import { Newspaper, Bell } from 'lucide-react';

const NEWS_DATA = [
  { id: 1, title: '"엔비디아 잡아라" 전 세계 반도체 전쟁 가속화... 삼성의 선택은?', time: '10분 전', category: '경제', isHot: true },
  { id: 2, title: '정부, 저PBR 기업 밸류업 프로그램 세부안 발표에 금융주 들썩', time: '1시간 전', category: '증시', isHot: false },
  { id: 3, title: '리튬 가격 하락세 멈췄나? 2차전지 관련주 일제히 반등 성공', time: '2시간 전', category: '산업', isHot: true },
  { id: 4, title: '금리 인하 시점 안개속... 미 연준 의장 "지표 더 지켜봐야"', time: '3시간 전', category: '해외', isHot: false },
];

const News = () => {
  return (
    <div className="flex-1 bg-[#0E1013] overflow-y-auto">
      <div className="p-4 md:p-10 pb-24 mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Newspaper className="text-blue-500" /> 실시간 뉴스
          </h2>
          <button className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {NEWS_DATA.map((news) => (
            <div key={news.id} className="flex gap-6 group cursor-pointer">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {news.isHot && <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-sm">HOT</span>}
                  <span className="text-[12px] font-bold text-slate-500">{news.category} · {news.time}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors whitespace-nowrap overflow-hidden text-ellipsis mb-2">
                  {news.title}
                </h3>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default News;