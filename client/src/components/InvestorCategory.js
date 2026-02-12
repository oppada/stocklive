import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const InvestorCategory = ({ investorTab }) => {
    const [foreignersData, setForeignersData] = useState([]);
    const [institutionsData, setInstitutionsData] = useState([]);
    const [individualsData, setIndividualsData] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Detect initial mobile state
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    useEffect(() => {
        // Generate mock data when investorTab changes
        const generateMockData = (prefix) => {
            return Array.from({ length: 50 }, (_, i) => ({
                rank: i + 1,
                name: `${prefix} 종목 ${i + 1}`,
                fluctuationRate: `${(Math.random() * 10 - 5).toFixed(2)}%`,
                tradeValue: `${Math.floor(Math.random() * 1000000000).toLocaleString()}원`,
            }));
        };
        setForeignersData(generateMockData('외국인'));
        setInstitutionsData(generateMockData('기관'));
        setIndividualsData(generateMockData('개인'));
    }, [investorTab]); // Re-generate mock data when investorTab changes
    const renderColumn = (title, data) => (_jsxs("div", { className: "flex-1 border-r border-white/5 last:border-r-0", children: [_jsx("h3", { className: "text-lg font-bold text-center mb-1", children: title }), _jsxs("div", { className: "text-[9px] sm:text-[11px] font-bold text-slate-400 grid grid-cols-[0.7fr_2fr_1fr_1.3fr] gap-x-2 px-2 pb-1 border-b border-white/10", children: [_jsx("span", { children: "\uC21C\uC704" }), _jsx("span", { children: "\uC885\uBAA9\uBA85" }), _jsx("span", { className: "text-right", children: "\uB4F1\uB77D\uB960" }), _jsx("span", { className: "text-right", children: "\uAC70\uB798\uB300\uAE08" })] }), _jsx("div", { className: "mt-2 space-y-2", children: data.slice(0, isMobile ? 20 : 50).map((item) => ( // Truncate to 20 items for mobile
                _jsxs("div", { className: "grid grid-cols-[0.7fr_2fr_1fr_1.3fr] gap-x-2 px-2 text-sm", children: [_jsx("span", { className: "text-[14px] font-bold text-slate-400", children: item.rank }), _jsx("span", { className: "font-bold text-xs sm:text-[16px] text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis", children: item.name }), _jsx("span", { className: `text-right text-[11px] sm:text-[13px] ${parseFloat(item.fluctuationRate) < 0 ? 'text-blue-500' : 'text-rose-500'}`, children: item.fluctuationRate }), _jsx("span", { className: "text-right text-[10px] sm:text-[12px] text-slate-500 font-medium", children: item.tradeValue })] }, item.rank))) })] }));
    if (foreignersData.length === 0 && institutionsData.length === 0 && individualsData.length === 0) {
        return _jsx("div", { className: "p-4 text-center", children: "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsx("div", { className: "px-4 pt-2", children: _jsxs("div", { className: "flex flex-col gap-4 md:flex-row", children: [renderColumn('외국인', foreignersData), renderColumn('기관', institutionsData), renderColumn('개인', individualsData)] }) }));
};
export default InvestorCategory;
