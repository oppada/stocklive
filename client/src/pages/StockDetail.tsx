import { ChevronLeft } from 'lucide-react';

const StockDetail = () => {
  const { symbol } = useParams(); // URL에서 종목 코드 추출
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('차트·호가');

  const tabs = ['차트·호가', '종목정보', '뉴스·공시', '거래현황', '커뮤니티'];

  return (
    <div className="flex flex-col h-screen bg-[#0E1013] text-white">
      {/* 상단 헤더 */}
      <header className="flex items-center p-4 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-4">
          <h1 className="text-lg sm:text-xl font-bold">{symbol || '삼성전자'}</h1>
          <p className="text-sm text-slate-400">005930 · KOSPI</p>
        </div>
      </header>

      {/* 탭 메뉴 */}
      <nav className="flex px-4 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-4 text-sm font-medium transition-all relative ${
              activeTab === tab ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </nav>

      {/* 탭별 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24">
        {activeTab === '차트·호가' && <ChartSection />}
        {activeTab === '종목정보' && <InfoSection />}
        {activeTab === '뉴스·공시' && <NewsSection />}
        {activeTab === '거래현황' && <TradeSection />}
        {activeTab === '커뮤니티' && <CommunitySection />}
      </main>
    </div>
  );
};

// --- 각 섹션 컴포넌트 ---

const ChartSection = () => (
  <div className="space-y-6">
    <div className="h-64 bg-[#16191C] rounded-3xl flex items-center justify-center border border-white/5">
      <p className="text-slate-500">차트가 들어갈 자리입니다 (Recharts 적용)</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-6 bg-[#16191C] rounded-3xl border border-white/5 text-center text-red-500 font-bold text-lg">매도 호가</div>
      <div className="p-6 bg-[#16191C] rounded-3xl border border-white/5 text-center text-blue-500 font-bold text-lg">매수 호가</div>
    </div>
  </div>
);

const InfoSection = () => (
  <div className="bg-[#16191C] p-6 rounded-3xl border border-white/5 space-y-4">
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400">시가총액</span>
      <span className="font-bold">465조 6,431억</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400">PER</span>
      <span className="font-bold">35.21배</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-400">배당수익률</span>
      <span className="font-bold">2.1%</span>
    </div>
  </div>
);

const NewsSection = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((n) => (
      <div key={n} className="p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border-b border-white/5">
        <h4 className="font-medium text-slate-200">삼성전자, 역대급 실적 발표 예정... 반도체 부문 흑자 전환</h4>
        <p className="text-xs text-slate-500 mt-2">경제신문 · 1시간 전</p>
      </div>
    ))}
  </div>
);

const TradeSection = () => (
  <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 text-sm">
    <table className="w-full text-left">
      <thead className="bg-white/5 text-slate-400">
        <tr>
          <th className="p-4">시간</th>
          <th className="p-4 text-right">체결가</th>
          <th className="p-4 text-right">거래량</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            <td className="p-4 text-slate-400">15:30:02</td>
            <td className="p-4 text-right font-medium">78,200</td>
            <td className="p-4 text-right text-red-500">1,240</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CommunitySection = () => {
  const [comment, setComment] = useState('');
  return (
    <div className="space-y-6">
      <div className="bg-[#16191C] p-4 rounded-2xl border border-white/5">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="주주들과 의견을 나눠보세요"
          className="w-full bg-transparent outline-none resize-none h-24 text-sm"
        />
        <div className="flex justify-end mt-2">
          <button className="px-4 py-2 bg-blue-600 rounded-full font-bold text-sm hover:bg-blue-500 transition-all">
            등록
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="p-4 bg-white/5 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 font-medium">
            <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px]">익명</div>
            <span>3분 전</span>
          </div>
          <p className="text-sm">삼전 8만 전자 가즈아!!</p>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;