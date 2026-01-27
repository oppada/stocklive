import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, User, MessageCircle, TrendingUp, 
  Home, PieChart, Newspaper, Zap, Send, ArrowUpRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KIS_APP_KEY = import.meta.env.VITE_KIS_APP_KEY;
const KIS_APP_SECRET = import.meta.env.VITE_KIS_APP_SECRET;

const themeData = [
  { "name": "AI 반도체", "codes": ["047810", "000660", "399220"] },
  { "name": "이차전지", "codes": ["086520", "373220", "066970"] },
  { "name": "로봇", "codes": ["272210", "454910", "054040"] },
  { "name": "우주항공", "codes": ["012450", "047810", "451760"] }
];

const tickerStocks = [
  { name: '삼성전자', code: '005930' },
  { name: 'SK하이닉스', code: '000660' },
  { name: '현대차', code: '005380' },
  { name: 'KODEX 200', code: '069500' },
];

const generateNickname = () => {
  const animals = ['사자', '호랑이', '독수리', '상어', '부엉이', '치타'];
  const adjs = ['용감한', '영리한', '빠른', '침착한', '날카로운', '강력한'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('홈');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  const [kisToken, setKisToken] = useState<string | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchKisToken = async () => {
    try {
      // ✅ 경로에 /api 추가
      const response = await fetch('/api/uapi/oauth2/tokenP', {
        method: 'POST',
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: KIS_APP_KEY,
          appsecret: KIS_APP_SECRET
        })
      });
      const data = await response.json();
      if (data.access_token) {
        const expires_at = new Date().getTime() + (data.expires_in - 120) * 1000;
        localStorage.setItem('kis-token', JSON.stringify({ token: data.access_token, expires_at }));
        setKisToken(data.access_token);
      }
    } catch (e) { console.error("KIS 토큰 에러", e); }
  };

  const fetchStockPrice = async (token: string, stockCode: string) => {
    try {
      // ✅ 경로에 /api 추가
      const response = await fetch(`/api/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`, {
        headers: {
          "authorization": `Bearer ${token}`,
          "appkey": KIS_APP_KEY,
          "appsecret": KIS_APP_SECRET,
          "tr_id": "FHKST01010100", //
          "custtype": "P",
          "Content-Type": "application/json; charset=UTF-8"
        }
      });
      
      const data = await response.json();
      if (data.output) {
        const prdy_vrss = Number(data.output.prdy_vrss);
        setStockPrices(prev => ({
          ...prev,
          [stockCode]: { 
            price: Number(data.output.stck_prpr).toLocaleString(), 
            change: data.output.prdy_ctrt,
            status: prdy_vrss > 0 ? 'up' : (prdy_vrss < 0 ? 'down' : 'flat')
          }
        }));
      }
    } catch (e) { console.error(`주가 조회 에러 (${stockCode})`, e); }
  };

  useEffect(() => {
    const stored = localStorage.getItem('kis-token');
    if (stored) {
      const { token, expires_at } = JSON.parse(stored);
      if (new Date().getTime() < expires_at) {
        setKisToken(token);
      } else {
        fetchKisToken();
      }
    } else {
      fetchKisToken();
    }

    const channel = supabase.channel('realtime-messages').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (payload) => setMessages(prev => [...prev, payload.new])
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!kisToken) return;
    const loadAllPrices = () => {
      tickerStocks.forEach(s => fetchStockPrice(kisToken, s.code));
      themeData.forEach(t => t.codes.forEach(code => fetchStockPrice(kisToken, code)));
    };
    loadAllPrices();
    const timer = setInterval(loadAllPrices, 60000);
    return () => clearInterval(timer);
  }, [kisToken]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText(''); 
    try {
      await supabase.from('messages').insert([{ user: myNickname, text, time: new Date() }]);
    } catch (e) { console.error("전송 실패", e); }
  };

  const renderHome = () => {
    const calculatedThemes = themeData.map(theme => {
      let sum = 0;
      let count = 0;
      theme.codes.forEach(code => {
        const price = stockPrices[code];
        if (price) {
          sum += parseFloat(price.change);
          count++;
        }
      });
      return { name: theme.name, avg: count > 0 ? sum / count : 0 };
    }).sort((a, b) => b.avg - a.avg);

    return (
      <section className="space-y-6">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="text-rose-500 w-5 h-5" /> 지금 뜨는 테마
          </h2>
          <span className="text-[10px] text-slate-500">실시간 등락 평균순</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {calculatedThemes.map((theme, i) => (
            <div key={theme.name} className="bg-[#111418] border border-white/5 p-5 rounded-3xl flex justify-between items-center transition-all hover:bg-[#1a1f26]">
              <div className="flex items-center gap-4">
                <span className={`text-lg font-black ${i < 3 ? 'text-rose-500' : 'text-slate-700'}`}>{i + 1}</span>
                <h3 className="font-bold text-white">{theme.name}</h3>
              </div>
              <span className={`text-lg font-black ${theme.avg >= 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                {theme.avg >= 0 ? '+' : ''}{theme.avg.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case '홈': return renderHome();
      case '추천':
        return (
          <section className="space-y-6 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><PieChart className="text-blue-500 w-5 h-5" /> 전략 종목</h2>
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">삼성전자 <span className="text-rose-500 text-sm ml-2">+1.2%</span></h3>
                <p className="text-slate-400 text-sm">HBM3 공급 본격화 기대감</p>
              </div>
              <button className="bg-white text-black p-2 rounded-xl"><ArrowUpRight className="w-5 h-5" /></button>
            </div>
          </section>
        );
      case '뉴스':
        return (
          <section className="space-y-6 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2"><Newspaper className="text-emerald-500 w-5 h-5" /> 실시간 뉴스</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b border-white/5 pb-4">
                  <h3 className="text-slate-200">[특징주] 반도체 장비주, 엔비디아 강세에 동반 오름세</h3>
                  <p className="text-xs text-slate-500 mt-1">10분 전</p>
                </div>
              ))}
            </div>
          </section>
        );
      case '탐색':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Search className="text-blue-500 w-5 h-5" /> 종목 탐색</h2>
            <div className="relative">
              <input type="text" placeholder="종목명 또는 코드 입력" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-12 py-4 text-white outline-none" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            </div>
          </section>
        );
      case '톡':
        return (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 -m-4 md:hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
              {messages.map((m, i) => (
                <div key={i} className="text-sm"><span className="font-bold text-blue-400">{m.user}:</span> <span className="text-slate-200">{m.text}</span></div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="fixed bottom-16 left-0 right-0 p-4 bg-slate-900 flex gap-2">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 bg-slate-950 rounded-xl px-4 py-2 text-white text-sm outline-none" placeholder="메세지 입력..." />
              <button className="bg-blue-600 p-2 rounded-xl text-white"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-white cursor-pointer" onClick={() => setActiveTab('홈')}>STOCK<span className="text-blue-500 italic">LIVE</span></h1>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400">
            {['홈', '추천', '뉴스', '탐색'].map((item) => (
              <button key={item} onClick={() => setActiveTab(item)} className={`${activeTab === item ? 'text-white border-b-2 border-blue-500 py-1' : 'hover:text-white'}`}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4"><Bell className="w-5 h-5 text-slate-400" /><User className="w-5 h-5 text-slate-400" /></div>
      </header>

      <div className="h-9 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-8 pr-8">
              {tickerStocks.map((s) => (
                <span key={s.code} className="flex items-center gap-1.5 text-slate-300">
                  <Zap className={`w-3 h-3 ${stockPrices[s.code]?.status === 'up' ? 'text-rose-500' : 'text-blue-500'}`} />
                  {s.name} <span className={stockPrices[s.code]?.status === 'up' ? 'text-rose-500' : 'text-blue-500'}>
                    {stockPrices[s.code] ? `${stockPrices[s.code].price} (${stockPrices[s.code].change}%)` : '조회 중...'}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-[340px] border-r border-white/5 flex-col bg-[#0a0c10]">
          <div className="p-4 border-b border-white/5 font-bold text-sm">실시간 톡</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className="text-[13px]"><span className="font-bold text-slate-400">{m.user}:</span> <span className="text-slate-200">{m.text}</span></div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
            <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none" placeholder="채팅 입력..." />
          </form>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 bg-black">
          <div className="max-w-3xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>

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
            <span className="text-[10px]">{item.name}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};

export default App;