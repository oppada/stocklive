import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

import { 
  Search, Bell, User, MessageCircle, Home as HomeIcon, PieChart, Newspaper
} from 'lucide-react'; 

// Page component imports
import HomePage from './pages/Home'; // Renamed to HomePage to avoid conflict
import Recommendation from './pages/Recommendation';
import News from './pages/News';
import Discovery from './pages/Discovery';
import StockDetail from './pages/StockDetail';
import WatchlistSidebar from './components/WatchlistSidebar';
import LoginModal from './components/LoginModal';

import { supabase } from './supabaseClient'; // Import supabase from the new client

const generateNickname = () => {
  const animals = ['사자', '호랑이', '독수리', '상어', '부엉이', '치타'];
  const adjs = ['용감한', '영리한', '빠른', '침착한', '날카로운', '강력한'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * adjs.length)]}`;
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat'; // Define isChatRoute
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
  const [marketIndicators, setMarketIndicators] = useState<Record<string, any>>({});
  const [favoritedStocks, setFavoritedStocks] = useState<string[]>([]); // New state for favorited stocks
  const [showLoginMessage, setShowLoginMessage] = useState(false); // New state for login message
  const [showLoginModal, setShowLoginModal] = useState(false); // New state for login modal
  const [user, setUser] = useState<any>(null); // New state for logged in user
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth check and listen
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

  // Function to handle favorite click
  const handleFavoriteClick = async (stockCode: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const isAlreadyFavorited = favoritedStocks.includes(stockCode);

    // 즉시 UI 반영 (Optimistic Update)
    setFavoritedStocks(prev => {
      const next = isAlreadyFavorited 
        ? prev.filter(code => code !== stockCode) 
        : Array.from(new Set([...prev, stockCode])); // 중복 제거 보장
      return next;
    });

    try {
      if (isAlreadyFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('stock_code', stockCode);
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, stock_code: stockCode }]);
      }
    } catch (e) {
      console.error("Favorite toggle failed:", e);
    }
  };

  useEffect(() => {
    if (showLoginMessage) {
      const timer = setTimeout(() => {
        setShowLoginMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoginMessage]);

  // Fetch market indicators for ticker
  useEffect(() => {
    const fetchMarketIndicators = async () => {
      try {
        const response = await fetch('/api/market/indicators');
        if (!response.ok) return;
        const data = await response.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setMarketIndicators(data);
        }
      } catch (error) {}
    };

    fetchMarketIndicators();
    const intervalId = setInterval(fetchMarketIndicators, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch prices for favoritedStocks
  useEffect(() => {
    const codesString = favoritedStocks.join(',');
    if (!codesString) {
      setStockPrices({});
      return;
    }

    const fetchWatchlistPrices = async () => {
      try {
        const response = await fetch(`/api/stocks/prices?codes=${codesString}`);
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          // 기존 데이터와 새 데이터를 병합하여 이름 누락 방지
          setStockPrices(prev => ({ 
            ...prev, 
            ...data 
          }));
        }
      } catch (error) {
        console.error("Failed to fetch watchlist stock prices:", error);
      }
    };

    fetchWatchlistPrices();
    const intervalId = setInterval(fetchWatchlistPrices, 30000);
    return () => clearInterval(intervalId);
  }, [favoritedStocks.join(',')]); // 배열 내용을 문자열로 변환하여 내용 변화 감지

  // Supabase realtime messages setup (KIS token logic removed from here)
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
    try {
      await supabase.from('messages').insert([{ user: user?.email?.split('@')[0] || myNickname, text, time: new Date() }]);
    } catch (e) { console.error("전송 실패", e); }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0 z-50">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-white cursor-pointer" onClick={() => navigate('/')}>STOCK<span className="text-blue-500 italic">MATE</span></h1>
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
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-slate-400" />
          <div onClick={() => user ? supabase.auth.signOut() : setShowLoginModal(true)} className="flex items-center gap-2 cursor-pointer group">
            <User className={`w-5 h-5 ${user ? 'text-blue-500' : 'text-slate-400'}`} />
            {user && <span className="text-xs text-slate-500 hidden md:block group-hover:text-rose-500">로그아웃</span>}
          </div>
        </div>
      </header>

      <div className="h-9 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0 z-40">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-10 pr-8">
              {Object.entries(marketIndicators)
                .filter(([_, data]) => data !== null) // 데이터가 null인 항목 제외
                .map(([name, data]: [string, any]) => {
                  const isUp = (data?.change || 0) > 0;
                  const isDown = (data?.change || 0) < 0;
                  const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : 'text-slate-400');
                  const sign = isUp ? '+' : '';
                  return (
                    <span key={name} className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-400">{name}</span>
                      <span className="font-mono">{Number(data?.price || 0).toLocaleString()}</span>
                      <span className={`${colorClass} font-mono`}>
                        {sign}{(data?.change || 0).toLocaleString()} ({sign}{(data?.changeRate || 0).toFixed(2)}%)
                      </span>
                    </span>
                  );
                })}
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

        <main className="flex-1 overflow-hidden p-0 bg-black relative">
          <div className="h-full">
            <Routes>
              <Route path="/" element={<HomePage stockPrices={stockPrices} favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} showLoginMessage={showLoginMessage} />} />
              <Route path="/recommendation" element={<Recommendation />} />
              <Route path="/news" element={<News />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/stock/:symbol" element={<StockDetail />} />
              {/* Add a route for chat on mobile if needed, or handle it within existing structure */}
              <Route path="/chat" element={
                <div className="flex flex-col h-full bg-[#0a0c10] text-slate-100 font-sans">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
                    {messages.map((m, i) => (
                      <div key={i} className="text-[13px]"><span className="font-bold text-slate-400">{m.user}:</span> <span className="text-slate-200">{m.text}</span></div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {/* 모바일 하단 네비바 높이(h-16)만큼 띄우기 위해 bottom-16 추가 */}
                  <form onSubmit={handleSendMessage} className="fixed md:absolute bottom-16 left-0 right-0 p-4 bg-[#0a0c10] border-t border-white/5 shrink-0 z-40">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto">
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
        {/* Watchlist Sidebar */}
        <aside className="hidden md:flex w-[280px] border-l border-white/5 bg-[#0a0c10] shrink-0">
          <WatchlistSidebar favoritedStocks={favoritedStocks} stockPrices={stockPrices} />
        </aside>
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