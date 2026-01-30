import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

import { 
  Search, Bell, User, MessageCircle, Home as HomeIcon, PieChart, Newspaper, Zap
} from 'lucide-react'; 

// Page component imports
import HomePage from './pages/Home'; // Renamed to HomePage to avoid conflict
import Recommendation from './pages/Recommendation';
import News from './pages/News';
import Discovery from './pages/Discovery';
import StockDetail from './pages/StockDetail';

import { supabase } from './supabaseClient'; // Import supabase from the new client

const KIS_APP_KEY = import.meta.env.VITE_KIS_APP_KEY;
const KIS_APP_SECRET = import.meta.env.VITE_KIS_APP_SECRET;

import tossThemesData from '../toss_real_150_themes.json';

// Process tossThemesData to extract all unique stock codes for fetching
const allUniqueThemeStockCodes = Array.from(new Set(
  tossThemesData.themes.flatMap(theme => theme.stocks.map(stock => stock.code))
));

const themeData = [
  { name: "All_Themes_Stocks", codes: allUniqueThemeStockCodes }
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
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * adjs.length)]}`;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat'; // Define isChatRoute
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
            price: Number(data.output.stck_prpr),
            change: data.output.prdy_ctrt,
            status: prdy_vrss > 0 ? 'up' : (prdy_vrss < 0 ? 'down' : 'flat'),
            tradeVolume: data.output.stck_vol, // Add tradeVolume
            tradeValue: data.output.acml_tr_pbmn, // Add tradeValue
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
    const loadAllPrices = async () => {
      for (const s of tickerStocks) {
        await fetchStockPrice(kisToken, s.code);
        await delay(100); // Small delay to prevent rate limiting
      }
      // themeData is now a single object {name: "...", codes: ["..."]}
      for (const code of themeData[0].codes) { // Access the codes array directly
        await fetchStockPrice(kisToken, code);
        await delay(100); // Small delay to prevent rate limiting
      }
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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-white cursor-pointer" onClick={() => navigate('/')}>STOCK<span className="text-blue-500 italic">LIVE</span></h1>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400">
            {[
              { name: '홈', path: '/' },
              { name: '추천', path: '/recommendation' },
              { name: '뉴스', path: '/news' },
              { name: '탐색', path: '/discovery' }
            ].map((item) => (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-blue-500 border-b-2 border-blue-500 py-1' : 'text-slate-400 hover:text-white'}`}
              >
                {item.name}
              </Link>
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
                  {s.name} <span className={stockPrices[s.code] ? (stockPrices[s.code].status === 'up' ? 'text-rose-500' : 'text-blue-500') : ''}>
                    {stockPrices[s.code] ? `${stockPrices[s.code].price} (${stockPrices[s.code].change}%)` : '조회 중...'}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
                  <aside className={`border-r border-white/5 flex-col bg-[#0a0c10] shrink-0 ${isChatRoute ? 'hidden' : 'hidden md:flex w-[340px]'}`}>          <div className="p-4 border-b border-white/5 font-bold text-sm">실시간 톡</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className="text-[13px]"><span className="font-bold text-slate-400">{m.user}:</span> <span className="text-slate-200">{m.text}</span></div>
            ))}
            <div ref={chatEndRef} />
          </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none flex-1" placeholder="채팅 입력..." />
                <button type="submit" className="px-4 py-3 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors">
                  전송
                </button>
              </div>
            </form>        </aside>

        <main className="flex-1 overflow-y-auto p-0 bg-black"> {/* Changed padding to p-0 */}
          <div className="h-full"> {/* Removed max-w-3xl mx-auto */}
            <Routes>
              <Route path="/" element={<HomePage stockPrices={stockPrices} />} />
              <Route path="/recommendation" element={<Recommendation />} />
              <Route path="/news" element={<News />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/stock/:symbol" element={<StockDetail />} />
              {/* Add a route for chat on mobile if needed, or handle it within existing structure */}
              <Route path="/chat" element={
                <div className="flex flex-col h-full bg-[#0a0c10] text-slate-100 font-sans pb-16">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((m, i) => (
                      <div key={i} className="text-[13px]"><span className="font-bold text-slate-400">{m.user}:</span> <span className="text-slate-200">{m.text}</span></div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none flex-1" placeholder="채팅 입력..." />
                      <button type="submit" className="px-4 py-3 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors">
                        전송
                      </button>
                    </div>
                  </form>
                </div>
              } />
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </div>
        </main>
      </div>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0c10] border-t border-white/5 flex items-center justify-around z-50">
        {[
          { name: '홈', path: '/', icon: <HomeIcon className="w-5 h-5" /> }, 
          { name: '추천', path: '/recommendation', icon: <PieChart className="w-5 h-5" /> }, 
          { name: '톡', path: '/chat', icon: <MessageCircle className="w-5 h-5" /> }, // '/chat' route for mobile
          { name: '탐색', path: '/discovery', icon: <Search className="w-5 h-5" /> },
          { name: '뉴스', path: '/news', icon: <Newspaper className="w-5 h-5" /> }
        ].map((item) => (
          <Link 
            key={item.name} 
            to={item.path} 
            className={`flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-blue-500' : 'text-slate-500'}`}
          >
            {item.icon}
            <span className="text-[10px]">{item.name}</span>
          </Link>
        ))}
      </footer>
    </div>
  );
};

export default App;