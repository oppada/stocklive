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
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-100">
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      
      {/* Header - Muted Light & Blur */}
      <header className="h-14 border-b border-slate-300/60 flex items-center justify-between px-4 md:px-6 bg-slate-50/90 backdrop-blur-md shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-10">
          <div className="flex flex-col cursor-pointer group" onClick={() => navigate('/')}>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter leading-none italic">
              STOCK<span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">MATE</span>
            </h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-bold text-slate-500">
            {[
              { name: '홈', path: '/' },
              { name: '추천', path: '/recommendation' },
              { name: '뉴스', path: '/news' },
              { name: '탐색', path: '/discovery' }
            ].map((item) => (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`relative py-1 transition-all hover:text-slate-800 ${location.pathname === item.path ? 'text-slate-800' : ''}`}
              >
                {item.name}
                {location.pathname === item.path && <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-slate-800 rounded-full" />}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/discovery')} className="p-2 text-slate-500 hover:text-slate-800 transition-all">
            <Search className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-slate-500 hover:text-slate-800 transition-all">
            <Bell className="w-5 h-5" />
          </button>
          
          <div 
            onClick={() => user ? navigate('/mypage') : setShowLoginModal(true)} 
            className={`hidden md:flex items-center justify-center cursor-pointer w-9 h-9 rounded-full transition-all active:scale-95 ${user ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
          >
            <User className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Ticker - Deep Navy Accent */}
      <div className="h-10 bg-[#1e293b] flex items-center overflow-hidden shrink-0 z-40 relative">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-14 pr-14">
              {Object.entries(marketIndicators)
                .filter(([_, data]) => data !== null)
                .map(([name, data]: [string, any]) => {
                  const isUp = (data?.change || 0) > 0;
                  const isDown = (data?.change || 0) < 0;
                  const colorClass = isUp ? 'text-rose-400' : (isDown ? 'text-blue-400' : 'text-slate-400');
                  const sign = isUp ? '+' : '';
                  return (
                    <span key={name} className="flex items-center gap-3">
                      <span className="text-slate-400 uppercase tracking-widest">{name}</span>
                      <span className="font-mono text-white text-[13px]">{Number(data?.price || 0).toLocaleString()}</span>
                      <span className={`${colorClass} font-mono px-1 rounded-md`}>
                        {sign}{(data?.change || 0).toLocaleString()} ({sign}{(data?.changeRate || 0).toFixed(2)}%)
                      </span>
                    </span>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-3 md:p-4 gap-4 bg-[#f8fafc]">
        {/* Left Sidebar (Chat) - Floating Card */}
        <aside className={`flex-col bg-white rounded-[24px] shadow-sm shrink-0 border border-slate-300/40 overflow-hidden ${isChatRoute ? 'hidden' : 'hidden md:flex w-[320px]'}`}>
          <div className="p-5 border-b border-slate-300 flex justify-between items-center">
            <h3 className="font-bold text-[15px] text-slate-800 flex items-center gap-2">
              <MessageCircle size={18} className="text-indigo-600" /> 실시간 종목 톡
            </h3>
            <div className="bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              <span className="text-[10px] font-black text-indigo-600 uppercase">Live</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-0 no-scrollbar bg-white">
            {messages.map((m, i) => (
              <div key={i} className="text-[14px] leading-snug group py-[1px]">
                <span className="font-bold text-slate-500 mr-1.5">{m.user}</span> 
                <span className="text-slate-800">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-300">
            <div className="flex items-center gap-2 bg-white rounded-2xl p-1 shadow-sm border border-slate-300">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full px-4 py-2 text-sm outline-none bg-transparent" placeholder="메시지 입력" />
              <button type="submit" onClick={(e) => { if(!user) { e.preventDefault(); setShowLoginModal(true); } }} className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-xl text-white hover:bg-indigo-700 transition-all shrink-0"><Zap size={16} fill="currentColor" /></button>
            </div>
          </form>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-0 relative">
          <Routes>
            <Route path="/" element={<HomePage stockPrices={stockPrices} favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} onLoginClick={() => setShowLoginModal(true)} user={user} />} />
            <Route path="/recommendation" element={<Recommendation />} />
            <Route path="/news" element={<News />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/stock/:symbol" element={<StockDetail favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} />} />
            <Route path="/mypage" element={<MyPage user={user} handleLogout={handleLogout} onLoginClick={() => setShowLoginModal(true)} />} />
            <Route path="/chat" element={
              <div className="flex flex-col h-full pb-16 md:pb-0">
                <div className="flex flex-col h-full bg-white rounded-[24px] overflow-hidden border border-slate-300/40 shadow-sm">
                  {/* Chat Header - Slim for Mobile Content Density */}
                  <div className="p-2.5 border-b border-slate-300 flex justify-between items-center shrink-0 bg-white/50">
                    <h3 className="font-bold text-[14px] text-slate-800 flex items-center gap-1.5 ml-1">
                      <MessageCircle size={16} className="text-indigo-600" /> 실시간 종목 톡
                    </h3>
                    <div className="bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 mr-1 scale-90">
                      <span className="text-[9px] font-black text-indigo-600 uppercase">Live</span>
                    </div>
                  </div>

                  {/* Chat Messages - Unified Ultra Density */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-0 no-scrollbar bg-white">
                    {messages.map((m, i) => (
                      <div key={i} className="text-[14px] leading-snug group py-0">
                        <span className="font-bold text-slate-500 mr-1.5">{m.user}</span> 
                        <span className="text-slate-800">{m.text}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-300 shrink-0">
                    <div className="flex items-center gap-2 bg-white rounded-2xl p-1 shadow-sm border border-slate-300">
                      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="w-full px-4 py-2 text-sm outline-none bg-transparent" placeholder="메시지 입력" />
                      <button type="submit" onClick={(e) => { if(!user) { e.preventDefault(); setShowLoginModal(true); } }} className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-xl text-white hover:bg-indigo-700 transition-all shrink-0"><Zap size={16} fill="currentColor" /></button>
                    </div>
                  </form>
                </div>
              </div>
            } />
          </Routes>
        </main>

        {/* Right Sidebar (Watchlist) - Floating Card */}
        <aside className="hidden md:flex w-[280px] bg-white rounded-[24px] shadow-sm shrink-0 border border-slate-300/40 overflow-hidden">
          <WatchlistSidebar favoritedStocks={[...favoritedStocks].reverse()} stockPrices={stockPrices} onFavoriteToggle={handleFavoriteClick} />
        </aside>
      </div>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-2xl border-t border-slate-200 flex items-center justify-around z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
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
            className={`flex flex-col items-center gap-1 cursor-pointer w-full py-2 transition-all ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-600'}`}
          >
            {item.icon}
            <span className="text-[11px] font-black">{item.name}</span>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default App;
