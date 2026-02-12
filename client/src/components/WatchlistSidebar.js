import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const WatchlistSidebar = ({ favoritedStocks, stockPrices }) => {
    const formatChange = (change, status) => {
        const numericChange = parseFloat(change);
        if (isNaN(numericChange))
            return change;
        const sign = status === 'up' ? '+' : (status === 'down' ? '-' : '');
        return `${sign}${Math.abs(numericChange)}%`;
    };
    return (_jsx("aside", { className: "w-full md:w-max shrink-0 bg-[#0E1013] md:border-l md:border-white/5 p-4 overflow-hidden", children: _jsxs("div", { className: "md:sticky md:top-4", children: [_jsx("h2", { className: "text-lg font-bold text-slate-100 mb-3", children: "\uAD00\uC2EC \uC885\uBAA9" }), _jsx("div", { className: "md:h-[calc(100vh-12rem)] overflow-y-auto hide-scrollbar p-2 border border-white/10 rounded-lg bg-[#121418]", children: favoritedStocks.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 text-center py-4", children: "\uAD00\uC2EC \uC885\uBAA9\uC744 \uCD94\uAC00\uD574\uBCF4\uC138\uC694." })) : (favoritedStocks.map((code) => {
                        const stock = stockPrices[code];
                        // Assuming stock.name is available in stockPrices[code] or passed directly in favoritedStocks
                        if (!stock || !stock.name)
                            return null; // Only render if stock data and name is available
                        return (_jsxs("div", { className: "flex justify-between items-center cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 group hover:bg-white/[0.03]", children: [_jsx("span", { className: "text-sm font-bold text-slate-300 group-hover:text-slate-100", children: stock.name }), _jsxs("span", { className: `text-xs font-medium whitespace-nowrap pl-4 ${stock.status === 'up' ? 'text-rose-500' : stock.status === 'down' ? 'text-blue-500' : 'text-slate-500'}`, children: [stock.status === 'up' ? '▲' : stock.status === 'down' ? '▼' : '', " ", formatChange(stock.change, stock.status)] })] }, code));
                    })) })] }) }));
};
export default WatchlistSidebar;
