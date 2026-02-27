import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
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

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('차트·호가');
  const [data, setData] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);

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
    // 30초마다 자동 갱신
    const interval = setInterval(fetchDetail, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const tabs = ['차트·호가', '시세', '종목정보', '매매동향', '뉴스·공시', '거래현황', '커뮤니티'];

  if (loading && !data) {
    return (
      <div className="flex flex-col h-screen bg-[#0E1013] text-white items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500 w-8 h-8 mb-4" />
        <p className="text-slate-400">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-screen bg-[#0E1013] text-white items-center justify-center">
        <p className="text-slate-400">종목 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-blue-600 rounded-full font-bold">뒤로가기</button>
      </div>
    );
  }

  const isUp = data.change > 0;
  const isDown = data.change < 0;
  const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : 'text-slate-400');
  const sign = isUp ? '+' : '';

  return (
    <div className="flex flex-col h-screen bg-[#0E1013] text-white">
      {/* 상단 헤더 */}
      <header className="flex items-center p-4 border-b border-white/5 bg-[#0E1013] sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold">{data.name}</h1>
            <span className="text-xs text-slate-500">{data.code} · {data.market}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-mono font-bold">{data.price.toLocaleString()}</span>
            <span className={`text-sm font-bold ${colorClass}`}>
              {sign}{data.change.toLocaleString()} ({sign}{data.changeRate.toFixed(2)}%)
            </span>
          </div>
        </div>
      </header>

      {/* 탭 메뉴 (모바일 2줄 그리드, PC flex) */}
      <nav className="grid grid-cols-4 sm:flex px-1 border-b border-white/5 bg-[#0E1013] sm:overflow-x-auto sm:whitespace-nowrap scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-1.5 sm:py-3 text-xs sm:text-sm sm:px-4 font-bold transition-all relative flex flex-col items-center justify-center border-b border-transparent ${
              activeTab === tab 
              ? 'text-blue-500 bg-blue-500/5' 
              : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </button>
        ))}
      </nav>

      {/* 탭별 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-44 md:pb-12">
        {activeTab === '차트·호가' && <ChartSection data={data} symbol={symbol!} />}
        {activeTab === '시세' && <PriceSection data={data} symbol={symbol!} />}
        {activeTab === '종목정보' && <InfoSection data={data} />}
        {activeTab === '매매동향' && <InvestorSection symbol={symbol!} />}
        {activeTab === '뉴스·공시' && <NewsSection />}
        {activeTab === '거래현황' && <TradeSection data={data} />}
        {activeTab === '커뮤니티' && <CommunitySection />}
        
        {/* 하단 여백 안정화를 위한 투명 요소 */}
        <div className="h-4 w-full opacity-0" />
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
          // 데이터가 너무 많으면 성능 저하를 방지하기 위해 100개 정도로 제한 (최신 순)
          setChartData(result.slice(-100));
        }
      } catch (e) {
        console.error("Failed to fetch chart data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChart();
  }, [symbol, timeframe]);

  const timeframes = [
    { label: '일봉', value: 'day' },
    { label: '주봉', value: 'week' },
    { label: '월봉', value: 'month' },
  ];

  const chartColor = data.change >= 0 ? '#F43F5E' : '#3B82F6';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex gap-1.5 bg-[#0E1013] p-1 rounded-full border border-white/5">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
                  timeframe === tf.value 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium">데이터: 네이버 금융</span>
        </div>
        
        <div className="h-[280px] w-full p-4 relative group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#16191C]/60 backdrop-blur-[2px] z-10 transition-all">
              <RefreshCw className="animate-spin text-blue-500 w-6 h-6" />
            </div>
          )}
          
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -60, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis 
                dataKey={timeframe === 'intraday' ? 'time' : 'date'} 
                hide 
              />
              <YAxis 
                domain={['auto', 'auto']} 
                hide 
              />
              <Tooltip
                cursor={{ stroke: '#ffffff15', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const price = payload[0].value;
                    const isUp = data.change >= 0;
                    return (
                      <div className="bg-[#1e2227]/95 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl ring-1 ring-white/5">
                        <p className="text-xs text-slate-400 mb-1 font-mono">{label}</p>
                        <p className={`text-sm font-bold font-mono ${isUp ? 'text-rose-500' : 'text-blue-500'}`}>
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
                dataKey={timeframe === 'intraday' ? 'price' : 'close'} 
                stroke={chartColor} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={1200}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="py-3 px-4 bg-[#16191C] rounded-2xl border border-white/5 text-center transition-all hover:bg-white/[0.02]">
          <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">시가</p>
          <p className="font-mono font-bold text-sm">{data.open.toLocaleString()}</p>
        </div>
        <div className="py-3 px-4 bg-[#16191C] rounded-2xl border border-white/5 text-center transition-all hover:bg-white/[0.02]">
          <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">거래량</p>
          <p className="font-mono font-bold text-sm">{data.volume.toLocaleString()}</p>
        </div>
        <div className="py-3 px-4 bg-[#16191C] rounded-2xl border border-white/5 text-center transition-all hover:bg-white/[0.02]">
          <p className="text-rose-500/80 text-xs font-bold mb-1 uppercase tracking-wider">고가</p>
          <p className="font-mono font-bold text-sm text-rose-500">{data.high.toLocaleString()}</p>
        </div>
        <div className="py-3 px-4 bg-[#16191C] rounded-2xl border border-white/5 text-center transition-all hover:bg-white/[0.02]">
          <p className="text-blue-500/80 text-xs font-bold mb-1 uppercase tracking-wider">저가</p>
          <p className="font-mono font-bold text-sm text-blue-500">{data.low.toLocaleString()}</p>
        </div>
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
        <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">실시간 호가</span>
            <span className="text-xs text-slate-500 font-mono">단위: 주</span>
          </div>
          {!hogaData || (hogaData.hoga && hogaData.hoga.length === 0) ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-600 italic gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-800" />
              <p className="text-sm">실시간 호가를 불러오는 중입니다...</p>
              <p className="text-xs text-slate-700 not-italic">장 마감 시간에는 데이터가 표시되지 않을 수 있습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {hogaData.hoga.map((h: any, i: number) => (
                <div key={i} className={`flex items-center h-8 border-b border-white/[0.02] relative group ${h.sellQty > 0 ? 'bg-blue-500/[0.02]' : 'bg-rose-500/[0.02]'}`}>
                  {/* 매도 잔량 (왼쪽) */}
                  <div className="w-24 px-3 text-right text-xs text-blue-400 font-mono z-10 transition-all group-hover:text-blue-300">
                    {h.sellQty > 0 ? h.sellQty.toLocaleString() : ''}
                  </div>
                  {h.sellQty > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10" style={{ width: `${(h.sellQty / maxQty) * 100}%`, maxWidth: '96px' }} />
                  )}
                  
                  {/* 가격 (중앙) */}
                  <div className={`flex-1 text-center font-mono font-bold h-full flex items-center justify-center border-x border-white/[0.03] text-xs ${h.sellQty > 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                    {h.price.toLocaleString()}
                  </div>

                  {/* 매수 잔량 (오른쪽) */}
                  <div className="w-24 px-3 text-left text-xs text-rose-500 font-mono z-10 transition-all group-hover:text-rose-300">
                    {h.buyQty > 0 ? h.buyQty.toLocaleString() : ''}
                  </div>
                  {h.buyQty > 0 && (
                    <div className="absolute right-0 top-0 bottom-0 bg-rose-500/10" style={{ width: `${(h.buyQty / maxQty) * 100}%`, maxWidth: '96px' }} />
                  )}
                </div>
              ))}
              <div className="flex border-t border-white/5 bg-white/[0.02] text-xs font-bold">
                <div className="flex-1 p-3 text-center border-r border-white/5 text-blue-400">매도잔량 {hogaData.sellTotalQty.toLocaleString()}</div>
                <div className="flex-1 p-3 text-center text-rose-500">매수잔량 {hogaData.buyTotalQty.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 주요 시세 정보 */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#16191C] px-3 py-6 sm:p-6 rounded-3xl border border-white/5 grid grid-cols-2 gap-y-4 gap-x-2 sm:gap-x-8 shadow-xl">
            <div className="col-span-2 border-b border-white/5 pb-2 mb-2 px-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">주요 시세 정보</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-slate-500 text-xs">시가</span>
              <span className="font-mono font-bold text-sm">{data.open.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-slate-500 text-xs">전일종가</span>
              <span className="font-mono font-bold text-sm text-slate-400">{(data.price - data.change).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-rose-500 text-xs">고가</span>
              <span className="font-mono font-bold text-sm text-rose-500">{data.high.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-rose-500 text-xs">상한가</span>
              <span className="font-mono font-bold text-sm text-rose-600">{(data.price * 1.3).toLocaleString().split('.')[0]}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-blue-500 text-xs">저가</span>
              <span className="font-mono font-bold text-sm text-blue-500">{data.low.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-blue-500 text-xs">하한가</span>
              <span className="font-mono font-bold text-sm text-blue-600">{(data.price * 0.7).toLocaleString().split('.')[0]}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-slate-500 text-xs">거래량</span>
              <span className="font-mono font-bold text-sm">{data.volume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 px-1">
              <span className="text-slate-500 text-xs">거래대금</span>
              <span className="font-mono font-bold text-sm">
                {data.tradeValue?.toString().replace('백만', '').trim()} <span className="text-[10px] text-slate-500 font-normal ml-0.5">백만</span>
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600/5 to-transparent px-3 py-4 sm:p-6 rounded-3xl border border-blue-500/10">
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed italic">
              * 호가 데이터는 10초 주기로 실시간 갱신됩니다. <br/>
              * 상/하한가는 현재가 기준 약 30%를 단순 계산한 수치입니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 일자별 시세 */}
      <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">일자별 시세</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] text-slate-500 border-b border-white/5">
              <tr>
                <th className="py-2.5 px-4 font-medium">날짜</th>
                <th className="py-2.5 px-4 text-right font-medium">종가</th>
                <th className="py-2.5 px-4 text-right font-medium">전일비</th>
                <th className="py-2.5 px-4 text-right font-medium">거래량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {history.map((h, i) => {
                const prevClose = i < history.length - 1 ? history[i+1].close : h.close;
                const diff = h.close - prevClose;
                return (
                  <tr key={i} className="hover:bg-white/[0.01]">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">{h.date.replace(/(\d{4})(\d{2})(\d{2})/, '$2/$3')}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{h.close.toLocaleString()}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${diff > 0 ? 'text-rose-500' : diff < 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                      {diff > 0 ? '▲' : diff < 0 ? '▼' : ''} {Math.abs(diff).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 font-mono">{h.volume.toLocaleString()}</td>
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

  if (loading) return <div className="py-20 text-center text-slate-500 font-medium">매매동향 데이터를 불러오는 중...</div>;

  if (!trendData || trendData.length === 0) {
    return (
      <div className="bg-[#16191C] rounded-3xl p-10 border border-white/5 text-center">
        <p className="text-slate-500">조회된 매매동향 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">일자별 투자자 매매동향</span>
        <span className="text-[10px] text-slate-500 font-mono">단위: 주</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.02] text-slate-500 border-b border-white/5">
            <tr>
              <th className="py-1 px-3 font-medium">날짜</th>
              <th className="py-1 px-3 text-right font-medium">외국인</th>
              <th className="py-1 px-3 text-right font-medium">기관</th>
              <th className="py-1 px-3 text-right font-medium">외인비율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {trendData.map((item, i) => {
              const fQty = Number(item.foreignNetPurchaseQuantity);
              const iQty = Number(item.institutionNetPurchaseQuantity);
              
              return (
                <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-1 px-3 text-slate-400 font-mono text-xs">{item.bizdate?.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</td>
                  <td className={`py-1 px-3 text-right font-mono font-bold text-xs ${fQty > 0 ? 'text-rose-500' : fQty < 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                    {fQty > 0 ? '+' : ''}{fQty.toLocaleString()}
                  </td>
                  <td className={`py-1 px-3 text-right font-mono font-bold text-xs ${iQty > 0 ? 'text-rose-500' : iQty < 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                    {iQty > 0 ? '+' : ''}{iQty.toLocaleString()}
                  </td>
                  <td className="py-1 px-3 text-right text-slate-400 font-mono text-xs">{item.foreignOwnershipRatio}%</td>
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
  <div className="bg-[#16191C] p-6 rounded-3xl border border-white/5 space-y-4">
    <h3 className="text-sm font-bold mb-4">투자지표</h3>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">시가총액</span>
      <span className="font-bold text-sm">{data.marketCap}</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">외국인소진율</span>
      <span className="font-bold text-sm">{data.foreignRate}</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">PER</span>
      <span className="font-bold text-sm">{data.per}</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">PBR</span>
      <span className="font-bold text-sm">{data.pbr}</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">배당수익률</span>
      <span className="font-bold text-sm">{data.dividendYield}</span>
    </div>
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-400 text-xs">EPS</span>
      <span className="font-bold text-sm">{data.eps}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-400 text-xs">52주 최고/최초</span>
      <span className="font-bold text-sm">{data.high52} / {data.low52}</span>
    </div>
  </div>
);

const NewsSection = () => (
  <div className="space-y-4 text-center py-20">
    <p className="text-slate-500 italic">뉴스는 준비 중입니다.</p>
  </div>
);

const TradeSection = ({ data }: { data: StockDetailData }) => (
  <div className="bg-[#16191C] rounded-3xl overflow-hidden border border-white/5 text-sm">
    <div className="p-4 border-b border-white/5 bg-white/5">
      <span className="font-bold">최근 5일 투자자별 매매동향</span>
    </div>
    <table className="w-full text-left">
      <thead className="bg-white/5 text-slate-400">
        <tr>
          <th className="p-4">날짜</th>
          <th className="p-4 text-right">외국인</th>
          <th className="p-4 text-right">기관</th>
          <th className="p-4 text-right">종가</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {data.investorTrends.map((trend, i) => {
          const isUp = trend.compareToPreviousPrice?.name === 'RISING';
          const isDown = trend.compareToPreviousPrice?.name === 'FALLING';
          const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : 'text-slate-400');
          
          return (
            <tr key={i}>
              <td className="p-4 text-slate-400">{trend.bizdate.slice(4).replace(/(\d{2})(\d{2})/, '$1/$2')}</td>
              <td className={`p-4 text-right ${trend.foreignerPureBuyQuant.startsWith('+') ? 'text-rose-500' : 'text-blue-500'}`}>
                {trend.foreignerPureBuyQuant}
              </td>
              <td className={`p-4 text-right ${trend.organPureBuyQuant.startsWith('+') ? 'text-rose-500' : 'text-blue-500'}`}>
                {trend.organPureBuyQuant}
              </td>
              <td className={`p-4 text-right font-medium ${colorClass}`}>
                {parseInt(trend.closePrice.replace(/,/g, '')).toLocaleString()}
              </td>
            </tr>
          );
        })}
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
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 font-medium">
          <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px]">익명</div>
          <span>방금 전</span>
        </div>
        <p className="text-sm">실시간 데이터가 연동되었습니다! 성투하세요!</p>
      </div>
    </div>
  );
};

export default StockDetail;