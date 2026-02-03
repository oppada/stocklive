

interface WatchlistSidebarProps {
  favoritedStocks: string[];
  stockPrices: Record<string, any>;
}

const WatchlistSidebar = ({ favoritedStocks, stockPrices }: WatchlistSidebarProps) => {

  const formatChange = (change: string, status: string) => {
    const numericChange = parseFloat(change);
    if (isNaN(numericChange)) return change;
    const sign = status === 'up' ? '+' : (status === 'down' ? '-' : '');
    return `${sign}${Math.abs(numericChange)}%`;
  };

  return (
    <aside className="w-full md:w-max shrink-0 bg-[#0E1013] md:border-l md:border-white/5 p-4 overflow-hidden">
      <div className="md:sticky md:top-4">
        <h2 className="text-lg font-bold text-slate-100 mb-3">관심 종목</h2>
        <div className="md:h-[calc(100vh-12rem)] overflow-y-auto hide-scrollbar p-2 border border-white/10 rounded-lg bg-[#121418]">
          {favoritedStocks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">관심 종목을 추가해보세요.</p>
          ) : (
            favoritedStocks.map((code) => {
              const stock = stockPrices[code];
              // Assuming stock.name is available in stockPrices[code] or passed directly in favoritedStocks
              if (!stock || !stock.name) return null; // Only render if stock data and name is available
              return (
                <div
                  key={code}
                  className="flex justify-between items-center cursor-pointer px-3 py-2 rounded-lg transition-all duration-200 group hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-bold text-slate-300 group-hover:text-slate-100">
                    {stock.name}
                  </span>
                  <span
                    className={`text-xs font-medium whitespace-nowrap pl-4 ${
                      stock.status === 'up' ? 'text-rose-500' : stock.status === 'down' ? 'text-blue-500' : 'text-slate-500'
                    }`}
                  >
                    {stock.status === 'up' ? '▲' : stock.status === 'down' ? '▼' : ''} {formatChange(stock.change, stock.status)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};

export default WatchlistSidebar;
