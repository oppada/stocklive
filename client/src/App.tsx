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
import WatchlistSidebar from './components/WatchlistSidebar';

import { supabase } from './supabaseClient'; // Import supabase from the new client



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



const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat'; // Define isChatRoute
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  const [stockPrices, setStockPrices] = useState<Record<string, any>>({});
  const [favoritedStocks, setFavoritedStocks] = useState<string[]>([]); // New state for favorited stocks
  const [showLoginMessage, setShowLoginMessage] = useState(false); // New state for login message
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Function to handle favorite click
  const handleFavoriteClick = async (stockCode: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setShowLoginMessage(true);
      return;
    }

    setFavoritedStocks(prevFavorites => {
      if (prevFavorites.includes(stockCode)) {
        return prevFavorites.filter(code => code !== stockCode); // Remove if already favorited
      } else {
        return [...prevFavorites, stockCode]; // Add if not favorited
      }
    });
  };

  useEffect(() => {
    if (showLoginMessage) {
      const timer = setTimeout(() => {
        setShowLoginMessage(false);
      }, 3000); // Hide message after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [showLoginMessage]);






  // Fetch prices for tickerStocks and favoritedStocks from new backend endpoint
  useEffect(() => {
    const fetchMarqueeAndWatchlistPrices = async () => {
      // Combine tickerStocks and favoritedStocks for a single API call
      const allCodesToFetch = Array.from(new Set([
        ...tickerStocks.map(s => s.code),
        ...favoritedStocks, // Assuming favoritedStocks contains only codes
      ]));

      if (allCodesToFetch.length === 0) return;

      try {
        const response = await fetch(`/api/stocks/prices?codes=${allCodesToFetch.join(',')}`);
        const data = await response.json();
        console.log('Marquee/Watchlist Prices:', data); // DEBUGGING
        if (Object.keys(data).length > 0) {
          setStockPrices(data);
        }
      } catch (error) {
        console.error("Failed to fetch marquee and watchlist stock prices:", error);
      }
    };

    // Initial fetch
    fetchMarqueeAndWatchlistPrices();

    // Set up interval for repeated fetching (e.g., every 30 seconds)
    const intervalId = setInterval(fetchMarqueeAndWatchlistPrices, 30000); // Fetch every 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [favoritedStocks]); // Re-run if favorited stocks change

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
      await supabase.from('messages').insert([{ user: myNickname, text, time: new Date() }]);
    } catch (e) { console.error("전송 실패", e); }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0">
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
        <div className="flex items-center gap-4"><Bell className="w-5 h-5 text-slate-400" /><User className="w-5 h-5 text-slate-400" /></div>
      </header>

      <div className="h-9 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-8 pr-8">
              {tickerStocks.map((s) => {
                const stock = stockPrices[s.code];
                const isUp = stock && stock.changeRate > 0;
                const isDown = stock && stock.changeRate < 0;
                const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : ''); // Default to no color for flat
                return (
                  <span key={s.code} className="flex items-center gap-1.5 text-slate-300">
                    <Zap className={`w-3 h-3 ${colorClass}`} /> {/* Apply color to Zap icon */}
                    {stock?.name} <span className={colorClass}> {/* Apply color to text, use stock?.name */}
                      {stock ? `${stock.price} (${(stock.changeRate || 0).toFixed(2)}%)` : '조회 중...'}
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

        <main className="flex-1 overflow-y-auto p-0 bg-black"> {/* Changed padding to p-0 */}
          <div className="h-full"> {/* Removed max-w-3xl mx-auto */}
            <Routes>
              <Route path="/" element={<HomePage stockPrices={stockPrices} favoritedStocks={favoritedStocks} onFavoriteToggle={handleFavoriteClick} showLoginMessage={showLoginMessage} />} />
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