import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, MessageCircle, Home as HomeIcon, PieChart, Newspaper, Zap } from 'lucide-react';
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
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [myNickname] = useState(generateNickname());
    const [stockPrices, setStockPrices] = useState({});
    const [favoritedStocks, setFavoritedStocks] = useState([]); // New state for favorited stocks
    const [showLoginMessage, setShowLoginMessage] = useState(false); // New state for login message
    const chatEndRef = useRef(null);
    // Function to handle favorite click
    const handleFavoriteClick = async (stockCode) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setShowLoginMessage(true);
            return;
        }
        setFavoritedStocks(prevFavorites => {
            if (prevFavorites.includes(stockCode)) {
                return prevFavorites.filter(code => code !== stockCode); // Remove if already favorited
            }
            else {
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
            if (allCodesToFetch.length === 0)
                return;
            try {
                const response = await fetch(`/api/stocks/prices?codes=${allCodesToFetch.join(',')}`);
                const data = await response.json();
                console.log('Marquee/Watchlist Prices:', data); // DEBUGGING
                if (Object.keys(data).length > 0) {
                    setStockPrices(data);
                }
            }
            catch (error) {
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
        const channel = supabase.channel('realtime-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => setMessages(prev => [...prev, payload.new])).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim())
            return;
        const text = inputText;
        setInputText('');
        try {
            await supabase.from('messages').insert([{ user: myNickname, text, time: new Date() }]);
        }
        catch (e) {
            console.error("전송 실패", e);
        }
    };
    return (_jsxs("div", { className: "flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans", children: [_jsxs("header", { className: "h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0", children: [_jsxs("div", { className: "flex items-center gap-8", children: [_jsxs("h1", { className: "text-xl font-black text-white cursor-pointer", onClick: () => navigate('/'), children: ["STOCK", _jsx("span", { className: "text-blue-500 italic", children: "LIVE" })] }), _jsx("nav", { className: "hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400", children: [
                                    { name: '홈', path: '/' },
                                    { name: '추천', path: '/recommendation' },
                                    { name: '뉴스', path: '/news' },
                                    { name: '탐색', path: '/discovery' }
                                ].map((item) => (_jsx(Link, { to: item.path, className: `flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-blue-500 border-b-2 border-blue-500 py-1' : 'text-slate-400 hover:text-white'}`, children: item.name }, item.name))) })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Bell, { className: "w-5 h-5 text-slate-400" }), _jsx(User, { className: "w-5 h-5 text-slate-400" })] })] }), _jsx("div", { className: "h-9 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0", children: _jsx("div", { className: "animate-marquee whitespace-nowrap flex text-[11px] font-bold", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "flex gap-8 pr-8", children: tickerStocks.map((s) => {
                            const stock = stockPrices[s.code];
                            const isUp = stock && stock.changeRate > 0;
                            const isDown = stock && stock.changeRate < 0;
                            const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : ''); // Default to no color for flat
                            return (_jsxs("span", { className: "flex items-center gap-1.5 text-slate-300", children: [_jsx(Zap, { className: `w-3 h-3 ${colorClass}` }), " ", stock?.name, " ", _jsxs("span", { className: colorClass, children: [" ", stock ? `${stock.price} (${(stock.changeRate || 0).toFixed(2)}%)` : '조회 중...'] })] }, s.code));
                        }) }, i))) }) }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("aside", { className: `border-r border-white/5 flex-col bg-[#0a0c10] shrink-0 ${isChatRoute ? 'hidden' : 'hidden md:flex w-[340px]'}`, children: ["          ", _jsx("div", { className: "p-4 border-b border-white/5 font-bold text-sm", children: "\uC2E4\uC2DC\uAC04 \uD1A1" }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-2", children: [messages.map((m, i) => (_jsxs("div", { className: "text-[13px]", children: [_jsxs("span", { className: "font-bold text-slate-400", children: [m.user, ":"] }), " ", _jsx("span", { className: "text-slate-200", children: m.text })] }, i))), _jsx("div", { ref: chatEndRef })] }), _jsx("form", { onSubmit: handleSendMessage, className: "p-4 border-t border-white/5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: inputText, onChange: e => setInputText(e.target.value), className: "w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none flex-1", placeholder: "\uCC44\uD305 \uC785\uB825..." }), _jsx("button", { type: "submit", className: "px-4 py-3 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors", children: "\uC804\uC1A1" })] }) }), "        "] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-0 bg-black", children: [" ", _jsxs("div", { className: "h-full", children: [" ", _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, { stockPrices: stockPrices, favoritedStocks: favoritedStocks, onFavoriteToggle: handleFavoriteClick, showLoginMessage: showLoginMessage }) }), _jsx(Route, { path: "/recommendation", element: _jsx(Recommendation, {}) }), _jsx(Route, { path: "/news", element: _jsx(News, {}) }), _jsx(Route, { path: "/discovery", element: _jsx(Discovery, {}) }), _jsx(Route, { path: "/stock/:symbol", element: _jsx(StockDetail, {}) }), _jsx(Route, { path: "/chat", element: _jsxs("div", { className: "flex flex-col h-full bg-[#0a0c10] text-slate-100 font-sans pb-16", children: [_jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-2", children: [messages.map((m, i) => (_jsxs("div", { className: "text-[13px]", children: [_jsxs("span", { className: "font-bold text-slate-400", children: [m.user, ":"] }), " ", _jsx("span", { className: "text-slate-200", children: m.text })] }, i))), _jsx("div", { ref: chatEndRef })] }), _jsx("form", { onSubmit: handleSendMessage, className: "p-4 border-t border-white/5 shrink-0", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: inputText, onChange: e => setInputText(e.target.value), className: "w-full bg-slate-900 rounded-xl px-4 py-3 text-xs text-white outline-none flex-1", placeholder: "\uCC44\uD305 \uC785\uB825..." }), _jsx("button", { type: "submit", className: "px-4 py-3 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors", children: "\uC804\uC1A1" })] }) })] }) }), _jsx(Route, { path: "*", element: _jsx("div", { children: "404 Not Found" }) })] })] })] }), _jsx("aside", { className: "hidden md:flex w-[280px] border-l border-white/5 bg-[#0a0c10] shrink-0", children: _jsx(WatchlistSidebar, { favoritedStocks: favoritedStocks, stockPrices: stockPrices }) })] }), _jsx("footer", { className: "md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0c10] border-t border-white/5 flex items-center justify-around z-50", children: [
                    { name: '홈', path: '/', icon: _jsx(HomeIcon, { className: "w-5 h-5" }) },
                    { name: '추천', path: '/recommendation', icon: _jsx(PieChart, { className: "w-5 h-5" }) },
                    { name: '톡', path: '/chat', icon: _jsx(MessageCircle, { className: "w-5 h-5" }) }, // '/chat' route for mobile
                    { name: '탐색', path: '/discovery', icon: _jsx(Search, { className: "w-5 h-5" }) },
                    { name: '뉴스', path: '/news', icon: _jsx(Newspaper, { className: "w-5 h-5" }) }
                ].map((item) => (_jsxs(Link, { to: item.path, className: `flex flex-col items-center gap-1 ${location.pathname === item.path ? 'text-blue-500' : 'text-slate-500'}`, children: [item.icon, _jsx("span", { className: "text-[10px]", children: item.name })] }, item.name))) })] }));
};
export default App;
