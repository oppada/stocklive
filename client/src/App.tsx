import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, User, MessageCircle, TrendingUp, 
  Home, PieChart, Newspaper, Zap, Send, ArrowUpRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// 1. 환경 변수 설정
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KIS_APP_KEY = import.meta.env.VITE_KIS_APP_KEY;
const KIS_APP_SECRET = import.meta.env.VITE_KIS_APP_SECRET;

const generateNickname = () => {
  const animals = ['사자', '호랑이', '독수리', '상어', '부엉이', '치타'];
  const adjs = ['용감한', '영리한', '빠른', '침착한', '날카로운', '강력한'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
};

// 티커에 표시할 종목 목록
const tickerStocks = [
  { name: '삼성전자', code: '005930' },
  { name: 'SK하이닉스', code: '000660' },
  { name: '현대차', code: '005380' },
  { name: 'KODEX 200', code: '069500' },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('홈');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  
  const [kisToken, setKisToken] = useState<string | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, { price: string; change: string; status: 'up' | 'down' | 'flat' }>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 2. 한국투자증권 Access Token 발급 함수
  const fetchKisToken = async () => {
    try {
      const response = await fetch('/api/get-token', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (data.access_token) {
        const now = new Date();
        const tokenData = {
          token: data.access_token,
          expires_at: now.getTime() + (data.expires_in - 120) * 1000 
        };
        localStorage.setItem('kis-token', JSON.stringify(tokenData));
        setKisToken(tokenData.token);
      }
    } catch (error) {
      console.error("❌ KIS 연동 에러:", error);
    }
  };

  // 3. 주가 조회 함수
  const fetchStockPrice = async (token: string, stockCode: string) => {
    try {
      const response = await fetch(`/api/get-price?stockCode=${stockCode}`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${token}`,
        }
      });
      
      const data = await response.json();
      
      if (data.rt_cd === "0" && data.output) {
        const currentPrice = Number(data.output.stck_prpr);
        const prdy_vrss = Number(data.output.prdy_vrss);
        const prdy_ctrt = data.output.prdy_ctrt;

        let status: 'up' | 'down' | 'flat' = 'flat';
        if (prdy_vrss > 0) status = 'up';
        else if (prdy_vrss < 0) status = 'down';

        setStockPrices(prev => ({
          ...prev,
          [stockCode]: { price: `${currentPrice.toLocaleString()}원`, change: `${prdy_vrss > 0 ? "+" : ""}${prdy_ctrt}%`, status }
        }));
      }
    } catch (error) {
      console.error(`❌ [${stockCode}] API 에러:`, error);
    }
  };

  useEffect(() => {
    const storedTokenData = localStorage.getItem('kis-token');
    if (storedTokenData) {
      const { token, expires_at } = JSON.parse(storedTokenData);
      if (new Date().getTime() < expires_at) {
        setKisToken(token);
      } else {
        fetchKisToken();
      }
    } else {
      fetchKisToken();
    }

    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => setMessages((prev) => [...prev, payload.new])
      ).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!kisToken) return;
    const fetchAllPrices = () => tickerStocks.forEach(stock => fetchStockPrice(kisToken, stock.code));
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 60000);
    return () => clearInterval(interval);
  }, [kisToken]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const { error } = await supabase.from('messages').insert([{ user: myNickname, text: inputText, time: new Date() }]);
      if (error) {
        throw error;
      }
      setInputText('');
    } catch (error) {
      console.error("❌ 메시지 전송 오류:", error);
      alert("메시지를 보낼 수 없습니다. 문제가 지속되면 관리자에게 문의하세요.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case '홈':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><TrendingUp className="text-rose-500 w-5 h-5" /> 급상승 테마</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ name: 'AI 반도체', rate: '+12.5%', stock: '한미반도체' }, { name: '온디바이스 AI', rate: '+8.2%', stock: '제주반도체' }].map((item, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded-lg text-sm">{item.rate}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-3 italic">대장주: {item.stock}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case '추천':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><PieChart className="text-blue-500 w-5 h-5" /> 전략 종목</h2>
            <div className="space-y-4">
              {[{ name: '삼성전자', change: '+1.2%', desc: 'HBM 공급 가시화에 따른 외인 매수세' }].map((item, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">{item.name} <span className="text-rose-500 text-sm ml-2">{item.change}</span></h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                  <button className="bg-white text-black p-2 rounded-xl"><ArrowUpRight className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </section>
        );
      case '뉴스':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Newspaper className="text-emerald-500 w-5 h-5" /> 실시간 속보</h2>
            <div className="space-y-1">
              {[1, 2, 3].map((item) => (
                <div key={item} className="border-b border-slate-900 py-4 group cursor-pointer">
                  <h3 className="text-[15px] font-medium text-slate-200 group-hover:text-blue-400">[속보] 코스피 외국인 기관 '쌍끌이' 매수에 상승세 지속</h3>
                  <p className="text-[11px] text-slate-500 mt-1">5분 전</p>
                </div>
              ))}
            </div>
          </section>
        );
      case '탐색': // ✅ 추가된 케이스
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Search className="text-blue-500 w-5 h-5" /> 종목 탐색</h2>
            <div className="relative">
              <input 
                type="text" 
                placeholder="종목명 또는 코드 입력" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-12 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400">인기 검색어</h3>
              <div className="flex flex-wrap gap-2">
                {['이차전지', '반도체', '초전도체', '엔비디아', '미국주식', '배당주'].map(tag => (
                  <button key={tag} className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs text-slate-300 hover:border-blue-500 hover:text-white transition-colors">
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      case '톡':
        return (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 -m-4 md:hidden relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-[14px] pb-20">
              {messages.map((m, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className={`font-bold mr-2 ${m.user === myNickname ? 'text-blue-400' : 'text-slate-400'}`}>{m.user}:</span>
                  <span className="text-slate-200">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="fixed bottom-16 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
              <input 
                type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="메시지 입력..." 
                className="flex-1 bg-slate-950 rounded-xl px-4 py-2 text-sm text-white"
              />
              <button type="submit" className="bg-blue-600 p-2 rounded-xl text-white"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      <header className="h-14 md:h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0a0c10] shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-white cursor-pointer" onClick={() => setActiveTab('홈')}>STOCK<span className="text-blue-500 italic">LIVE</span></h1>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400">
            {['홈', '추천', '뉴스', '탐색'].map((item) => (
              <button key={item} onClick={() => setActiveTab(item)} className={`${activeTab === item ? 'text-white border-b-2 border-blue-500 py-1' : 'hover:text-white'}`}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
          <User className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
        </div>
      </header>

      {/* 실시간 티커 영역 */}
      <div className="h-9 md:h-10 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              {tickerStocks.map((stock) => {
                const stockData = stockPrices[stock.code];
                const colorClass = stockData?.status === 'up' ? 'text-rose-500' : (stockData?.status === 'down' ? 'text-blue-500' : 'text-slate-400');
                return (
                  <span key={stock.code} className="flex items-center gap-1.5 text-slate-300">
                    <Zap className={`w-3 h-3 ${colorClass}`} /> 
                    {stock.name}
                    <span className={`ml-1 font-black ${colorClass}`}>
                      {stockData ? `${stockData.price} (${stockData.change})` : '조회 중...'}
                    </span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-[340px] border-r border-white/5 flex-col bg-[#0a0c10] shrink-0">
          <div className="p-4 border-b border-white/5 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-white"><MessageCircle className="w-4 h-4 text-blue-500" /> 실시간 톡</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="text-[13px] leading-relaxed break-all">
                <span className={`font-bold mr-2 ${m.user === myNickname ? 'text-blue-400' : 'text-slate-400'}`}>{m.user}:</span>
                <span className="text-slate-300">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
            <input 
              type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none" 
              placeholder="채팅을 입력하세요..." 
            />
          </form>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 bg-black">
          <div className="max-w-3xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>

      {/* 하단 네비게이션 */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0c10] border-t border-white/5 flex items-center justify-around z-50">
        {[
          { name: '홈', icon: <Home className="w-5 h-5" /> }, 
          { name: '추천', icon: <PieChart className="w-5 h-5" /> }, 
          { name: '톡', icon: <MessageCircle className="w-5 h-5" /> }, 
          { name: '탐색', icon: <Search className="w-5 h-5" /> },
          { name: '뉴스', icon: <Newspaper className="w-5 h-5" /> }
        ].map((item) => (
          <button key={item.name} onClick={() => setActiveTab(item.name)} className={`flex flex-col items-center gap-1 ${activeTab === item.name ? 'text-blue-500' : 'text-slate-500'}`}>
            {item.icon}
            <span className="text-[10px] font-medium">{item.name}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};

export default App;