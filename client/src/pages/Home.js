import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Heart, Flame, ArrowDownCircle, BarChart3, Coins, LayoutGrid, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorCategory from '../components/InvestorCategory';
const Home = ({ favoritedStocks, onFavoriteToggle }) => {
    const [activeTab, setActiveTab] = useState(() => {
        const savedTab = localStorage.getItem('activeTab');
        return savedTab || '급상승'; // Default to '급상승' if nothing in localStorage
    });
    const [investorTab] = useState('순매수');
    const [selectedThemeId, setSelectedThemeId] = useState(null);
    const [allThemes, setAllThemes] = useState([]);
    const [selectedThemeStocks, setSelectedThemeStocks] = useState([]); // New state for stocks of selected theme
    const [rankingStocks, setRankingStocks] = useState([]);
    const [retryCount, setRetryCount] = useState(0); // New state for retry count
    const MAX_RETRIES = 5; // Max retries constant
    const [isLoadingThemes, setIsLoadingThemes] = useState(true);
    const [isLoadingStocks, setIsLoadingStocks] = useState(false);
    const [isLoadingThemeStocks, setIsLoadingThemeStocks] = useState(false); // New state for loading theme stocks
    // Save activeTab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);
    // Fetch top performing themes from backend
    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const response = await fetch('/api/themes/top-performing'); // Use new backend API
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Top Performing Themes Data:', data); // DEBUGGING
                if (Array.isArray(data)) {
                    setAllThemes(data);
                    if (data.length > 0) {
                        setSelectedThemeId(data[0].name);
                    }
                }
                else {
                    setAllThemes([]); // Ensure it's always an array
                }
            }
            catch (error) {
                console.error("Failed to fetch top performing themes:", error);
                setAllThemes([]); // Set to empty array on error to prevent crash
            }
            finally {
                setIsLoadingThemes(false);
            }
        };
        fetchThemes();
    }, []); // Empty dependency array means this runs once on mount
    // Fetch stocks for the selected theme from backend
    useEffect(() => {
        (async () => {
            if (activeTab === '테마' && selectedThemeId) {
                setIsLoadingThemeStocks(true); // Set loading true when starting fetch
                setSelectedThemeStocks([]); // Clear previous stocks immediately
                try {
                    const response = await fetch(`/api/themes/${selectedThemeId}/stocks`); // Use new backend API
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    console.log(`Stocks for theme ${selectedThemeId}:`, data); // DEBUGGING
                    if (Array.isArray(data)) {
                        setSelectedThemeStocks(data);
                    }
                    else {
                        setSelectedThemeStocks([]);
                    }
                }
                catch (error) {
                    console.error(`Failed to fetch stocks for theme ${selectedThemeId}:`, error);
                    setSelectedThemeStocks([]); // Set to empty array on error
                }
                finally {
                    setIsLoadingThemeStocks(false); // Set loading false after fetch completes
                }
            }
            else {
                setSelectedThemeStocks([]); // Clear stocks if not in theme tab or no theme selected
            }
        })();
    }, [activeTab, selectedThemeId]); // Re-run when activeTab or selectedThemeId changes
    // Fetch ranking data for other categories from backend
    useEffect(() => {
        const rankingCategories = ['급상승', '급하락', '거래량', '거래대금'];
        if (rankingCategories.includes(activeTab)) {
            setIsLoadingStocks(true);
            setRankingStocks([]); // Clear previous ranking stocks when tab changes
            const fetchRanking = async () => {
                try {
                    let rankingType;
                    switch (activeTab) {
                        case '급상승':
                            rankingType = 'gainer';
                            break;
                        case '급하락':
                            rankingType = 'loser';
                            break;
                        case '거래량':
                            rankingType = 'volume';
                            break;
                        case '거래대금':
                            rankingType = 'value';
                            break;
                        default:
                            rankingType = '';
                            break;
                    }
                    if (rankingType) {
                        const response = await fetch(`/api/ranking/${rankingType}`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        console.log(`Ranking data for ${activeTab}:`, data); // DEBUGGING
                        if (data.length === 0 && retryCount < MAX_RETRIES) {
                            console.log(`No ranking data, retrying in 5 seconds (Attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                            setRetryCount(prev => prev + 1);
                            setTimeout(fetchRanking, 5000); // Retry after 5 seconds
                        }
                        else {
                            setRankingStocks(data);
                            setIsLoadingStocks(false); // Only set false if data is received or max retries reached
                            setRetryCount(0); // Reset retry count
                        }
                    }
                }
                catch (error) {
                    console.error(`Failed to fetch ranking data for ${activeTab}:`, error);
                    setRankingStocks([]);
                    setIsLoadingStocks(false); // Set false on explicit error
                    setRetryCount(0); // Reset retry count
                }
            };
            fetchRanking();
        }
        else {
            setRankingStocks([]); // Clear ranking stocks if not in a ranking tab
            setIsLoadingStocks(false); // Ensure loading is false when tab is not ranking
            setRetryCount(0); // Reset retry count
        }
    }, [activeTab, retryCount]);
    const categoryIcons = {
        '급상승': _jsx(Flame, { size: 16, className: "text-[#F04452]" }),
        '급하락': _jsx(ArrowDownCircle, { size: 16, className: "text-[#3182F6]" }),
        '거래량': _jsx(BarChart3, { size: 16, className: "text-[#2ECC71]" }),
        '거래대금': _jsx(Coins, { size: 16, className: "text-[#F1C40F]" }),
        '테마': _jsx(LayoutGrid, { size: 16, className: "text-[#9B59B6]" }),
        '투자자별': _jsx(Users, { size: 16, className: "text-[#3498DB]" }),
    };
    const gridLayout = "grid grid-cols-[16px_20px_104px_53px_53px_50px_50px] md:grid-cols-[45px_60px_0.5fr_110px_90px_100px_90px_120px] items-center gap-1";
    // 데이터 할당 (에러 방지용 초기값)
    let displayStocks = [];
    if (activeTab === '테마') {
        displayStocks = selectedThemeStocks; // Use stocks fetched from new backend API
    }
    else if (['급상승', '급하락', '거래량', '거래대금'].includes(activeTab)) {
        displayStocks = rankingStocks; // Use fetched ranking data
    }
    else if (activeTab !== '투자자별') {
        displayStocks = []; // No mock data for other categories
    }
    return (_jsxs("div", { className: "flex flex-col h-screen w-full bg-[#0E1013] text-white", children: [_jsx("div", { className: "sticky top-0 z-30 bg-[#0E1013] border-b border-white/5", children: _jsx("nav", { className: "flex items-center justify-around gap-1 px-2 py-2 hide-scrollbar md:justify-start md:gap-5 md:px-4", children: ['급상승', '급하락', '거래량', '거래대금', '테마', '투자자별'].map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab), className: `flex-1 flex items-center justify-center gap-1 px-0 py-2 rounded-xl text-xs md:text-[14px] md:flex-none md:justify-start md:gap-2 md:px-1 font-bold transition-all whitespace-nowrap
                ${activeTab === tab ? 'text-white bg-[#1C1E23]' : 'text-slate-500 hover:text-slate-300'}`, children: [_jsx("span", { className: "hidden md:block", children: categoryIcons[tab] }), " ", tab] }, tab))) }) }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [activeTab === '테마' && (_jsx("aside", { className: "hidden md:block w-52 border-r border-white/5 overflow-y-auto shrink-0 p-2 hide-scrollbar", children: isLoadingThemes ? (_jsx("div", { className: "p-2 text-slate-500", children: "\uD14C\uB9C8 \uB85C\uB529 \uC911..." })) : (allThemes.map((t) => ( // Use allThemes now
                        _jsx("div", { onClick: () => setSelectedThemeId(t.name), className: `cursor-pointer px-3 py-1 rounded-xl transition-all ${selectedThemeId === t.name ? 'bg-[#1C1E23]' : 'hover:bg-white/5'}`, children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: `font-bold text-[14px] truncate max-w-[120px] ${selectedThemeId === t.name ? 'text-white' : 'text-slate-400'}`, children: t.name }), _jsxs("span", { className: `text-[14px] ${t.avgChangeRate > 0 ? 'text-[#F04452]' : 'text-[#3182F6]'}`, children: [t.avgChangeRate.toFixed(2), "%"] })] }) }, t.name)))) })), _jsxs("main", { className: "flex-1 overflow-y-auto hide-scrollbar pb-16", children: [activeTab === '테마' && (_jsx("div", { className: "md:hidden p-2 mb-1", children: _jsx("select", { value: selectedThemeId || '', onChange: (e) => setSelectedThemeId(e.target.value), className: "w-full bg-[#1C1E23] border border-white/10 rounded-lg px-3 py-1 text-white text-sm", children: isLoadingThemes ? (_jsx("option", { children: "\uD14C\uB9C8 \uB85C\uB529 \uC911..." })) : (allThemes.map(t => ( // Use allThemes
                                    _jsxs("option", { value: t.name, children: [t.name, " (", t.avgChangeRate > 0 ? '+' : '', t.avgChangeRate.toFixed(2), "%)"] }, t.name)))) }) })), activeTab === '투자자별' ? (_jsx("div", { className: "w-full bg-[#1C1E23] rounded-[32px] p-4 border border-white/5", children: _jsx(InvestorCategory, { investorTab: investorTab }) })) : (_jsxs("div", { className: "w-full px-2 py-4", children: [_jsxs("div", { className: `${gridLayout} pb-3 border-b border-white/5 text-[11px] font-bold text-slate-600 uppercase`, children: [_jsx("div", { className: "text-center", children: "#" }), _jsx("div", { className: "text-center" }), _jsx("div", { children: "\uC885\uBAA9\uBA85" }), _jsx("div", { className: "text-right", children: "\uD604\uC7AC\uAC00" }), _jsx("div", { className: "text-right", children: "\uB4F1\uB77D\uB960" }), _jsx("div", { className: "text-right", children: "\uAC70\uB798\uB300\uAE08" }), _jsx("div", { className: "text-right", children: "\uAC70\uB798\uB7C9" }), _jsx("div", { className: "hidden md:block text-center", children: "\uCC28\uD2B8" }), " "] }), ((isLoadingStocks && (activeTab !== '테마')) || (isLoadingThemeStocks && activeTab === '테마')) && (_jsx("div", { className: "text-center text-slate-400 py-4", children: "\uB370\uC774\uD130 \uB85C\uB529 \uC911..." })), !isLoadingStocks && displayStocks.length > 0 ? (_jsx("div", { className: "mt-1 space-y-1 pb-4", children: displayStocks.map((stock, idx) => {
                                            const isUp = stock.changeRate > 0;
                                            return (_jsxs("div", { className: `${gridLayout} py-0 rounded-2xl hover:bg-[#1C1E23] transition-all group`, children: [_jsx("div", { className: "text-center text-[14px] font-bold text-slate-500", children: idx + 1 }), " ", _jsx("div", { className: "flex justify-center", children: _jsx(Heart, { size: 16, onClick: () => onFavoriteToggle(stock.code), className: `cursor-pointer ${favoritedStocks.includes(stock.code) ? 'text-[#F04452]' : 'text-slate-800'}` }) }), _jsxs("div", { className: "overflow-hidden", children: [" ", _jsxs(Link, { to: `/stock/${stock.code}`, className: "font-bold text-xs md:text-[16px] text-slate-100 truncate px-0 group-hover:text-white", children: [stock.name || stock.code, " "] })] }), _jsx("div", { className: "text-right text-xs md:text-[15px] font-bold text-slate-200 font-mono", children: Number(stock.price).toLocaleString() }), " ", _jsxs("div", { className: `text-right text-xs md:text-[15px] font-bold ${isUp ? 'text-[#F04452]' : 'text-[#3182F6]'}`, children: [isUp ? '+' : '', (stock.changeRate || 0).toFixed(2), "%"] }), " ", _jsxs("div", { className: "text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono", children: [(parseInt(stock.tradeValue) / 100000000).toFixed(0), "\uC5B5"] }), " ", _jsxs("div", { className: "text-right text-xs md:text-[15px] font-bold text-slate-500 font-mono", children: [((stock.volume || 0) / 10000).toFixed(0), "\uB9CC"] }), " ", _jsx("div", { className: "hidden md:flex justify-center items-center h-full w-full", children: _jsx(ResponsiveContainer, { width: 108, height: 36, children: _jsxs(LineChart, { data: stock.chart, children: [_jsx(YAxis, { hide: true, domain: ['dataMin', 'dataMax'] }), _jsx(Line, { type: "monotone", dataKey: "v", stroke: isUp ? '#F04452' : '#3182F6', strokeWidth: 2, dot: false, isAnimationActive: false })] }) }) })] }, stock.code));
                                        }) })) : (!isLoadingStocks && activeTab !== '테마' && activeTab !== '투자자별') ? (_jsx("div", { className: "text-center text-slate-400 py-4", children: "\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })) : null] }))] })] })] }));
};
export default Home;
