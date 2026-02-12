import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, Zap, Globe, BarChart3, Trophy } from 'lucide-react';
const CATEGORIES = [
    { icon: _jsx(Zap, { size: 18 }), name: '급상승', color: 'from-red-500 to-orange-500' },
    { icon: _jsx(Globe, { size: 18 }), name: '해외주식', color: 'from-blue-500 to-cyan-500' },
    { icon: _jsx(BarChart3, { size: 18 }), name: '배당주', color: 'from-green-500 to-emerald-500' },
    { icon: _jsx(Trophy, { size: 18 }), name: '수익률', color: 'from-purple-500 to-pink-500' },
];
const Discovery = () => {
    return (_jsx("div", { className: "flex-1 bg-[#0E1013] overflow-y-auto", children: _jsxs("div", { className: "p-4 md:p-10 pb-24 mx-auto", children: [_jsxs("div", { className: "relative mb-12", children: [_jsx(Search, { className: "absolute left-5 top-1/2 -translate-y-1/2 text-slate-500", size: 20 }), _jsx("input", { type: "text", placeholder: "\uC5B4\uB5A4 \uC885\uBAA9\uC774 \uAD81\uAE08\uD558\uC138\uC694?", className: "w-full bg-[#16191C] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white outline-none focus:border-blue-500/50 transition-all text-base" }), "        "] }), _jsx("div", { className: "flex gap-8 justify-center overflow-x-auto pb-10 scrollbar-hide", children: CATEGORIES.map((cat, i) => (_jsxs("div", { className: "flex flex-col items-center gap-3 shrink-0 group cursor-pointer", children: [_jsx("div", { className: `w-12 h-12 md:w-16 md:h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${cat.color} group-hover:scale-110 transition-transform`, children: _jsx("div", { className: "w-full h-full rounded-full bg-[#0E1013] p-1", children: _jsx("div", { className: "w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-white", children: cat.icon }) }) }), _jsx("span", { className: "text-[13px] font-bold text-slate-400 group-hover:text-white", children: cat.name })] }, i))) }), _jsxs("div", { className: "bg-[#16191C] rounded-[32px] p-8 border border-white/5", children: [_jsxs("h3", { className: "text-xl font-bold text-white mb-8 flex items-center gap-2", children: [_jsx(Activity, { className: "text-blue-500", size: 20 }), " \uC9C0\uAE08 \uB9CE\uC774 \uCC3E\uB294 \uD0A4\uC6CC\uB4DC"] }), _jsx("div", { className: "flex flex-wrap gap-3", children: ['초전도체', '엔비디아 실적', '금리 결정', '비트코인 신고가', '애플 비전프로', '저PBR', 'CXL 반도체'].map((tag, i) => (_jsx("span", { className: "px-6 py-3 bg-white/5 rounded-full text-sm font-medium text-slate-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-all", children: tag }, i))) })] })] }) }));
};
// 상단 헤더에 필요한 Activity 아이콘 추가 임포트 (위쪽에는 없으므로)
import { Activity } from 'lucide-react';
export default Discovery;
