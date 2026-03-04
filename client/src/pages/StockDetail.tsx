import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Heart } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface StockDetailData {
  code: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  changeType: string;
  market: string;
  marketCap: string;
  per: string;
  pbr: string;
  eps: string;
  bps: string;
  dividendYield: string;
  foreignRate: string;
  open: number;
  high: number;
  low: number;
  volume: number;
  tradeValue: string;
  high52: string;
  low52: string;
  chartImages: {
    day: string;
    candleDay: string;
    areaYear: string;
  };
  investorTrends: any[];
}

interface StockDetailProps {
  favoritedStocks: string[];
  onFavoriteToggle: (code: string) => void;
}

const StockDetail = ({ favoritedStocks, onFavoriteToggle }: StockDetailProps) => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('차트·호가');
  const [data, setData] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // 관심종목 여부 판단
  const isFavorited = favoritedStocks.includes(symbol || '');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stocks/${symbol}/detail`);
      if (response.ok) {
        const detail = await response.json();
        setData(detail);
      }
    } catch (error) {
      console.error("Failed to fetch stock detail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const tabs = ['차트·호가', '시세', '종목정보', '매매동향', '뉴스·공시', '거래현황', '커뮤니티'];

  if (loading && !data) {
    return (
      <div className="flex flex-col h-screen bg-[#f0f3f7] items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600 w-8 h-8 mb-4" />
        <p className="text-slate-500 font-bold">데이터를 불러오고 있습니다...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-screen bg-[#f0f3f7] items-center justify-center p-6 text-center">
        <p className="text-slate-500 font-bold mb-6 text-lg text-pretty">종목 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="px-10 py-4 bg-blue-600 rounded-2xl font-black text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest text-sm">뒤로가기</button>
      </div>
    );
  }

  const isUp = data.change > 0;
  const isDown = data.change < 0;
  const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-600' : 'text-slate-400');
  const sign = isUp ? '+' : '';

  return (
    <div className="flex flex-col h-screen bg-[#f0f3f7] text-slate-900 overflow-hidden">
      {/* 상단 헤더 */}
      <header className="flex items-center p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors mr-2">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">{data.name}</h1>
            <button 
              onClick={() => onFavoriteToggle(data.code)}
              className={`p-2 rounded-xl transition-all border ${isFavorited ? 'bg-rose-50 border-rose-100 text-rose-500 shadow-sm' : 'bg-white border-slate-200 text-slate-300 hover:text-rose-300 hover:border-rose-100'}`}
            >
              <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
            </button>
            <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{data.code} · {data.market}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 leading-none">{data.price.toLocaleString()}</span>
            <span className={`text-sm sm:text-base font-black ${colorClass} bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100`}>
              {sign}{data.change.toLocaleString()} ({sign}{data.changeRate.toFixed(2)}%)
            </span>
          </div>
        </div>
      </header>

      {/* 탭 메뉴 */}
      <nav className="flex px-2 border-b border-slate-200 bg-white overflow-x-auto no-scrollbar whitespace-nowrap sticky top-[73px] z-10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 px-4 text-xs sm:text-sm font-black transition-all relative flex flex-col items-center justify-center border-b-4 ${
              activeTab === tab 
              ? 'text-blue-600 border-blue-600 bg-blue-50/30' 
              : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* 탭별 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-44 md:pb-12 bg-[#f0f3f7]">
        <div className="max-w-5xl mx-auto space-y-6">
            {activeTab === '차트·호가' && <ChartSection data={data} symbol={symbol!} />}
            {activeTab === '시세' && <PriceSection data={data} symbol={symbol!} />}
            {activeTab === '종목정보' && <InfoSection data={data} />}
            {activeTab === '매매동향' && <InvestorSection symbol={symbol!} />}
            {activeTab === '뉴스·공시' && <NewsSection />}
            {activeTab === '거래현황' && <TradeSection data={data} />}
            {activeTab === '커뮤니티' && <CommunitySection />}
        </div>
        
        {/* 하단 여백 안정화 */}
        <div className="h-10 w-full opacity-0" />
      </main>
    </div>
  );
};

// --- 각 섹션 컴포넌트 ---

const ChartSection = ({ data, symbol }: { data: StockDetailData, symbol: string }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('day');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/stocks/${symbol}/charts?timeframe=${timeframe}`);
        if (res.ok) {
          const result = await res.json();
          setChartData(result.slice(-100));
        }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchChart();
  }, [symbol, timeframe]);

  const timeframes = [
    { label: '일봉', value: 'day' },
    { label: '주봉', value: 'week' },
    { label: '월봉', value: 'month' },
  ];

  const chartColor = data.change >= 0 ? '#F43F5E' : '#2563EB';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-1 bg-slate-200/50 p-1 rounded-2xl border border-slate-200/50">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 ${
                  timeframe === tf.value 
                  ? 'bg-white text-blue-600 shadow-md border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">REALTIME CHART</span>
        </div>
        
        <div className="h-[320px] w-full p-6 relative group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10">
              <RefreshCw className="animate-spin text-blue-600 w-6 h-6" />
            </div>
          )}
          
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -60, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                cursor={{ stroke: '#00000010', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const price = payload[0].value;
                    const isUp = data.change >= 0;
                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
                        <p className="text-[10px] text-slate-400 mb-1 font-black uppercase tracking-tighter">{label}</p>
                        <p className={`text-base font-black font-mono ${isUp ? 'text-rose-500' : 'text-blue-600'}`}>
                          {Number(price).toLocaleString()}원
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke={chartColor} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '시가', value: data.open.toLocaleString(), color: 'text-slate-900' },
          { label: '거래량', value: data.volume.toLocaleString(), color: 'text-slate-900' },
          { label: '고가', value: data.high.toLocaleString(), color: 'text-rose-500' },
          { label: '저가', value: data.low.toLocaleString(), color: 'text-blue-600' }
        ].map((item, i) => (
          <div key={i} className="py-4 px-5 bg-white rounded-[24px] border border-slate-200 shadow-sm text-center transition-all hover:shadow-md">
            <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">{item.label}</p>
            <p className={`font-mono font-black text-sm ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PriceSection = ({ data, symbol }: { data: StockDetailData, symbol: string }) => {
  const [hogaData, setHogaData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [hogaRes, historyRes] = await Promise.all([
        fetch(`/api/stocks/${symbol}/hoga`),
        fetch(`/api/stocks/${symbol}/charts?timeframe=day&count=20`)
      ]);
      if (hogaRes.ok) setHogaData(await hogaRes.json());
      if (historyRes.ok) setHistory((await historyRes.json()).reverse());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  const maxQty = useMemo(() => {
    if (!hogaData || !hogaData.hoga) return 0;
    return Math.max(...hogaData.hoga.map((h: any) => Math.max(h.sellQty || 0, h.buyQty || 0)));
  }, [hogaData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 호가창 */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Order Book</span>
            <span className="text-[10px] text-slate-400 font-black">UNIT: SHARE</span>
          </div>
          {!hogaData || (hogaData.hoga && hogaData.hoga.length === 0) ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 italic gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-200" />
              <p className="text-sm font-bold">호가 데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {hogaData.hoga.map((h: any, i: number) => (
                <div key={i} className={`flex items-center h-9 border-b border-slate-50 relative group ${h.sellQty > 0 ? 'bg-blue-50/20' : 'bg-rose-50/20'}`}>
                  <div className="w-24 px-4 text-right text-[11px] text-blue-600 font-mono font-black z-10">{h.sellQty > 0 ? h.sellQty.toLocaleString() : ''}</div>
                  {h.sellQty > 0 && <div className="absolute left-0 top-0 bottom-0 bg-blue-100/50" style={{ width: `${(h.sellQty / maxQty) * 100}%`, maxWidth: '96px' }} />}
                  <div className={`flex-1 text-center font-mono font-black h-full flex items-center justify-center border-x border-slate-50 text-[13px] ${h.sellQty > 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                    {h.price.toLocaleString()}
                  </div>
                  <div className="w-24 px-4 text-left text-[11px] text-rose-500 font-mono font-black z-10">{h.buyQty > 0 ? h.buyQty.toLocaleString() : ''}</div>
                  {h.buyQty > 0 && <div className="absolute right-0 top-0 bottom-0 bg-rose-100/50" style={{ width: `${(h.buyQty / maxQty) * 100}%`, maxWidth: '96px' }} />}
                </div>
              ))}
              <div className="flex border-t border-slate-100 bg-slate-50/50 text-[11px] font-black">
                <div className="flex-1 p-4 text-center border-r border-slate-100 text-blue-600 uppercase tracking-tighter">Sell Tot {hogaData.sellTotalQty.toLocaleString()}</div>
                <div className="flex-1 p-4 text-center text-rose-500 uppercase tracking-tighter">Buy Tot {hogaData.buyTotalQty.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 주요 시세 정보 */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 grid grid-cols-2 gap-y-5 gap-x-8 shadow-sm">
            <div className="col-span-2 border-b border-slate-100 pb-3 mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Market Summary</span>
            </div>
            {[
              { label: '시가', value: data.open.toLocaleString() },
              { label: '전일종가', value: (data.price - data.change).toLocaleString(), muted: true },
              { label: '고가', value: data.high.toLocaleString(), color: 'text-rose-500' },
              { label: '상한가', value: (data.price * 1.3).toLocaleString().split('.')[0], color: 'text-rose-600' },
              { label: '저가', value: data.low.toLocaleString(), color: 'text-blue-600' },
              { label: '하한가', value: (data.price * 0.7).toLocaleString().split('.')[0], color: 'text-blue-700' },
              { label: '거래량', value: data.volume.toLocaleString() },
              { label: '거래대금', value: data.tradeValue?.toString().replace('백만', '').trim() + ' M' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                <span className="text-slate-400 text-[11px] font-black">{item.label}</span>
                <span className={`font-mono font-black text-sm ${item.color || (item.muted ? 'text-slate-400' : 'text-slate-900')}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white px-6 py-5 rounded-[24px] border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic">
              * 호가 데이터는 10초 주기로 실시간 갱신됩니다. <br/>
              * 상/하한가는 현재가 기준 약 ±30% 범위를 단순 계산한 수치입니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 일자별 시세 */}
      <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Daily Price History</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase font-black tracking-tighter">
              <tr>
                <th className="py-4 px-6">DATE</th>
                <th className="py-4 px-6 text-right">CLOSE</th>
                <th className="py-4 px-6 text-right">CHANGE</th>
                <th className="py-4 px-6 text-right">VOLUME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((h, i) => {
                const prevClose = i < history.length - 1 ? history[i+1].close : h.close;
                const diff = h.close - prevClose;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-500 font-mono font-black">{h.date.replace(/(\d{4})(\d{2})(\d{2})/, '$2/$3')}</td>
                    <td className="py-4 px-6 text-right font-mono font-black text-slate-900 text-sm">{h.close.toLocaleString()}</td>
                    <td className={`py-4 px-6 text-right font-mono font-black ${diff > 0 ? 'text-rose-500' : diff < 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {diff > 0 ? '▲' : diff < 0 ? '▼' : ''} {Math.abs(diff).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400 font-mono font-bold">{h.volume.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InvestorSection = ({ symbol }: { symbol: string }) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stocks/${symbol}/investor-trend`);
        if (res.ok) setTrendData(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchTrend();
  }, [symbol]);

  if (loading) return <div className="py-24 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Fetching trends...</div>;

  return (
    <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Investor Trends</span>
        <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">Unit: Shares</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase font-black tracking-tighter">
            <tr>
              <th className="py-4 px-6">DATE</th>
              <th className="py-4 px-6 text-right">FOREIGN</th>
              <th className="py-4 px-6 text-right">INSTITUTION</th>
              <th className="py-4 px-6 text-right">F.RATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {trendData.map((item, i) => {
              const fQty = Number(item.foreignNetPurchaseQuantity);
              const iQty = Number(item.institutionNetPurchaseQuantity);
              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-slate-500 font-mono font-black">{item.bizdate?.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</td>
                  <td className={`py-4 px-6 text-right font-mono font-black ${fQty > 0 ? 'text-rose-500' : fQty < 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {fQty > 0 ? '+' : ''}{fQty.toLocaleString()}
                  </td>
                  <td className={`py-4 px-6 text-right font-mono font-black ${iQty > 0 ? 'text-rose-500' : iQty < 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {iQty > 0 ? '+' : ''}{iQty.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-400 font-mono font-bold">{item.foreignOwnershipRatio}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InfoSection = ({ data }: { data: StockDetailData }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Fundamental Data</h3>
    {[
      { label: '시가총액', value: data.marketCap },
      { label: '외국인소진율', value: data.foreignRate },
      { label: 'PER', value: data.per },
      { label: 'PBR', value: data.pbr },
      { label: 'EPS', value: data.eps },
      { label: '배당수익률', value: data.dividendYield },
      { label: '52주 최고/최저', value: `${data.high52} / ${data.low52}` }
    ].map((item, i) => (
      <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
        <span className="text-slate-400 text-xs font-bold">{item.label}</span>
        <span className="font-black text-slate-800 text-sm tracking-tight">{item.value}</span>
      </div>
    ))}
  </div>
);

const NewsSection = () => (
  <div className="bg-white rounded-[32px] p-20 border border-slate-200 shadow-sm text-center">
    <RefreshCw className="w-10 h-10 text-slate-100 mx-auto mb-4" />
    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">News feed is coming soon</p>
  </div>
);

const TradeSection = ({ data }: { data: StockDetailData }) => (
  <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent 5 Days Flow</span>
    </div>
    <div className="overflow-x-auto">
        <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] border-b border-slate-100 uppercase tracking-tighter">
            <tr>
            <th className="py-4 px-6">DATE</th>
            <th className="py-4 px-6 text-right">FOREIGN</th>
            <th className="py-4 px-6 text-right">INSTITUTION</th>
            <th className="py-4 px-6 text-right">CLOSE</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
            {data.investorTrends.map((trend, i) => {
            const isUp = trend.compareToPreviousPrice?.name === 'RISING';
            const isDown = trend.compareToPreviousPrice?.name === 'FALLING';
            return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-6 text-slate-500 font-mono font-black">{trend.bizdate.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</td>
                <td className={`py-4 px-6 text-right font-mono font-black ${trend.foreignerPureBuyQuant.startsWith('+') ? 'text-rose-500' : 'text-blue-600'}`}>
                    {trend.foreignerPureBuyQuant}
                </td>
                <td className={`py-4 px-6 text-right font-mono font-black ${trend.organPureBuyQuant.startsWith('+') ? 'text-rose-500' : 'text-blue-600'}`}>
                    {trend.organPureBuyQuant}
                </td>
                <td className={`py-4 px-6 text-right font-mono font-black text-sm ${isUp ? 'text-rose-500' : (isDown ? 'text-blue-600' : 'text-slate-400')}`}>
                    {parseInt(trend.closePrice.replace(/,/g, '')).toLocaleString()}
                </td>
                </tr>
            );
            })}
        </tbody>
        </table>
    </div>
  </div>
);

const CommunitySection = () => {
  const [comment, setComment] = useState('');
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm group focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="주주들과 자유롭게 의견을 나누어 보세요..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 outline-none resize-none h-28 text-sm font-medium focus:bg-white transition-all"
        />
        <div className="flex justify-end mt-4">
          <button className="px-8 py-3 bg-blue-600 rounded-2xl font-black text-sm text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest">
            등록하기
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400">ID</div>
          <span className="text-xs font-black text-slate-500">운영진 · 방금 전</span>
        </div>
        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"실시간 시장 데이터가 성공적으로 동기화되었습니다. 성투하세요!"</p>
      </div>
    </div>
  );
};

export default StockDetail;
