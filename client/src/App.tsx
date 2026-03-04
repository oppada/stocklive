import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

import { 
  Search, Bell, User, MessageCircle, Home as HomeIcon, PieChart, Newspaper, Zap
} from 'lucide-react'; 

// Page component imports
import HomePage from './pages/Home'; 
import Recommendation from './pages/Recommendation';
import News from './pages/News';
import Discovery from './pages/Discovery';
import StockDetail from './pages/StockDetail';
import MyPage from './pages/MyPage';
import WatchlistSidebar from './components/WatchlistSidebar';
import LoginModal from './components/LoginModal';

import { supabase } from './supabaseClient'; 

const generateNickname = () => {
  const animals = ['사자', '호랑이', '독수리', '상어', '부엉이', '치타'];
  const adjs = ['용감한', '영리한', '빠른', '침착한', '날카로운', '강력한'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * adjs.length)]}`;
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat'; 
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
  const [marketIndicators, setMarketIndicators] = useState<Record<string, any>>({});
  const [favoritedStocks, setFavoritedStocks] = useState<string[]>([]); 
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [user, setUser] = useState<any>(null); 
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
      else setFavoritedStocks([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('stock_code')
        .eq('user_id', userId);
      
      if (error) throw error;
      if (data) setFavoritedStocks(data.map(f => f.stock_code));
    } catch (e) {
      console.error("Failed to fetch favorites:", e);
    }
  };

  const handleFavoriteClick = async (stockCode: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const isAlreadyFavorited = favoritedStocks.includes(stockCode);
    setFavoritedStocks(prev => {
      const next = isAlreadyFavorited 
        ? prev.filter(code => code !== stockCode) 
        : Array.from(new Set([...prev, stockCode]));
      return next;
    });

    try {
      if (isAlreadyFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('stock_code', stockCode);
      } else {
        await supabase.from('favorites').insert([{ user_id: user.id, stock_code: stockCode }]);
      }
    } catch (e) { console.error("Favorite toggle failed:", e); }
  };

  useEffect(() => {
    const fetchMarketIndicators = async () => {
      try {
        const response = await fetch('/api/market/indicators');
        if (!response.ok) return;
        const data = await response.json();
        if (data && typeof data === 'object') setMarketIndicators(data);
      } catch (error) {}
    };
    fetchMarketIndicators();
    const intervalId = setInterval(fetchMarketIndicators, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const codesString = favoritedStocks.join(',');
    if (!codesString) { setStockPrices({}); return; }

    const fetchWatchlistPrices = async () => {
      try {
        const response = await fetch(`/api/stocks/prices?codes=${codesString}`);
        const data = await response.json();
        if (data && typeof data === 'object') {
          setStockPrices(prev => {
            const newState = { ...prev };
            Object.keys(data).forEach(code => {
              const newInfo = data[code];
              if (newInfo) {
                newState[code] = { ...newInfo, name: newInfo.name || newState[code]?.name || code };
              }
            });
            return newState;
          });
        }
      } catch (error) {}
    };
    fetchWatchlistPrices();
    const intervalId = setInterval(fetchWatchlistPrices, 30000);
    return () => clearInterval(intervalId);
  }, [favoritedStocks.join(',')]);

  useEffect(() => {
    const channel = supabase.channel('realtime-messages').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (payload) => setMessages(prev => [...prev, payload.new])
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText(''); 
    const displayName = user?.user_metadata?.nickname || user?.email?.split('@')[0] || myNickname;
    try {
      await supabase.from('messages').insert([{ user: displayName, text, time: new Date() }]);
    } catch (e) { console.error("전송 실패", e); }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
      localStorage.removeItem('supabase.auth.token'); 
    } finally {
      setUser(null);
      setFavoritedStocks([]);
      navigate('/'); 
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#f4f7fa] text-slate-900 font-sans selection:bg-indigo-100">
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      
      {/* Header */}
      <header className="h-16 border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-10">
          <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/')}>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter leading-none">STOCK<span className="text-indigo-600 transition-colors group-hover:text-indigo-500">MATE</span></h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-bold text-slate-400">
            {[
              { name: '홈', path: '/' },
              { name: '추천', path: '/recommendation' },
              { name: '뉴스', path: '/news' },
              { name: '탐색', path: '/discovery' }
            ].map((item) => (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`relative py-2 transition-all hover:text-slate-900 ${location.pathname === item.path ? 'text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600' : ''}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => navigate('/discovery')} className="md:hidden p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
            <Search className="w-4 h-4" />
          </button>
          
          <button className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
            <Bell className="w-4 h-4" />
          </button>
          
          {/* Desktop Only User/Login Button */}
          <div 
            onClick={() => user ? navigate('/mypage') : setShowLoginModal(true)} 
            className={`hidden md:flex items-center justify-center cursor-pointer w-10 h-10 rounded-xl transition-all active:scale-95 shadow-md ${user ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}
          >
            <User className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Ticker - Brightened text for labels */}
      <div className="h-10 bg-[#0f172a] border-b border-white/5 flex items-center overflow-hidden shrink-0 z-40 relative shadow-inner">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-14 pr-14">
              {Object.entries(marketIndicators)
                .filter(([_, data]) => data !== null)
                .map(([name, data]: [string, any]) => {
                  const isUp = (data?.change || 0) > 0;
                  const isDown = (data?.change || 0) < 0;
                  const colorClass = isUp ? 'text-rose-400' : (isDown ? 'text-sky-400' : 'text-slate-400');
                  const sign = isUp ? '+' : '';
                  return (
                    <span key={name} className="flex items-center gap-3">
                      {/* Brightened label */}
                      <span className="text-slate-200 font-black tracking-widest uppercase leading-none">{name}</span>
                      <span className="font-mono text-white text-[13px] leading-none">{Number(data?.price || 0).toLocaleString()}</span>
                      <span className={`${colorClass} font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5 leading-none flex items-center`}>
                        {sign}{(data?.change || 0).toLocaleString()} ({sign}{(data?.changeRate || 0).toFixed(2)}%)
                      </span>
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-[#f4f7fa]">
        <aside className={`border-r border-slate-200/80 flex-col bg-white shrink-0 ${isChatRoute ? 'hidden' : 'hidden md:flex w-[360px]'}`}>
          <div className="p-5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-[13px] text-slate-800 flex items-center gap-2 uppercase">
              <MessageCircle size={14} className="text-indigo-600" /> 실시간 종목 톡
            </h3>
            <div className="flex items-center bg-blue-50 px-2 py-1 rounded-lg gap-1.5 border border-blue-100">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-blue-600 uppercase">Live</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-white to-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className="text-[13px] leading-relaxed py-0.5 px-1 hover:bg-slate-50 transition-colors rounded">
                <span className="font-black text-slate-400 mr-2">{m.user}:</span> 
                <span className="text-slate-700 font-medium">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-5 border-t border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-2">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 text-xs outline-none flex-1 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" placeholder="함께 대화해보세요" />
              <button type="submit" onClick={(e) => { if(!user) { e.preventDefault(); setShowLoginModal(true); } }} className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl text-white hover:bg-indigo-700 active:scale-90 transition-all shrink-0 shadow-lg shadow-indigo-600/20"><Zap size={18} fill="currentColor" /></button>
            </div>
          </form>
        </aside>

        <main className="flex-1 overflow-hidden p-0 relative shadow-[inset_0px_0px_60px_rgba(0,0,0,0.02)]">
          <Routes>
            <Route path="/" element={<HomePage stockPrices={stockPrices} favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} onLoginClick={() => setShowLoginModal(true)} user={user} />} />
            <Route path="/recommendation" element={<Recommendation />} />
            <Route path="/news" element={<News />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/stock/:symbol" element={<StockDetail favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} />} />
            <Route path="/mypage" element={<MyPage user={user} handleLogout={handleLogout} onLoginClick={() => setShowLoginModal(true)} />} />
            <Route path="/chat" element={
              <div className="flex flex-col h-full bg-[#f4f7fa]">
                <div className="flex-1 overflow-y-auto p-5 space-y-1.5 pb-28">
                  {messages.map((m, i) => (
                    <div key={i} className="text-[14px] leading-relaxed">
                      <span className="font-black text-slate-400 mr-2">{m.user}:</span> 
                      <span className="text-slate-800 font-medium">{m.text}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="fixed bottom-16 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shrink-0 z-40">
                  <div className="flex items-center gap-3 max-w-3xl mx-auto">
                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-slate-100 rounded-2xl px-6 py-4 text-sm outline-none flex-1 border-2 border-transparent focus:border-indigo-500 focus:bg-white shadow-inner transition-all font-medium" placeholder="메시지를 입력하세요" />
                    <button type="submit" onClick={(e) => { if(!user) { e.preventDefault(); setShowLoginModal(true); } }} className="px-8 py-4 bg-slate-900 rounded-2xl text-[14px] font-black text-white hover:bg-black active:scale-95 shadow-xl shadow-slate-900/20 transition-all">전송</button>
                  </div>
                </form>
              </div>
            } />
          </Routes>
        </main>

        <aside className="hidden md:flex w-[320px] border-l border-slate-200/80 bg-white shrink-0">
          <WatchlistSidebar favoritedStocks={[...favoritedStocks].reverse()} stockPrices={stockPrices} onFavoriteToggle={handleFavoriteClick} />
        </aside>
      </div>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-2xl border-t border-slate-200 flex items-center justify-around z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        {[
          { name: '홈', path: '/', icon: <HomeIcon className="w-5 h-5" /> }, 
          { name: '추천', path: '/recommendation', icon: <PieChart className="w-5 h-5" /> }, 
          { name: '톡', path: '/chat', icon: <MessageCircle className="w-5 h-5" /> }, 
          { name: '뉴스', path: '/news', icon: <Newspaper className="w-5 h-5" /> },
          { name: '마이', path: '/mypage', icon: <User className="w-5 h-5" />, authRequired: true }
        ].map((item) => (
          <div 
            key={item.name} 
            onClick={() => {
              if (item.authRequired && !user) { setShowLoginModal(true); } else { navigate(item.path); }
            }}
            className={`flex flex-col items-center gap-1 cursor-pointer w-full py-2 transition-all ${location.pathname === item.path ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`${location.pathname === item.path ? 'bg-indigo-50 p-2 rounded-2xl shadow-inner border border-indigo-100/50' : 'p-2'}`}>
              {item.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default App;
