import { Link } from 'react-router-dom';

interface WatchlistSidebarProps {
  favoritedStocks: string[];
  stockPrices: Record<string, any>;
}

const WatchlistSidebar = ({ favoritedStocks, stockPrices }: WatchlistSidebarProps) => {
  return (
    <div className="w-full flex flex-col bg-[#0a0c10] h-full">
      <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center bg-[#0a0c10]">
        <h2 className="text-sm font-bold text-white">관심 종목</h2>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full">
          {favoritedStocks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
        {favoritedStocks.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-700 text-lg">❤</div>
            <p className="text-[12px] text-slate-600 font-medium">관심 종목이 없습니다.</p>
          </div>
        ) : (
          favoritedStocks.map((code) => {
            const stock = stockPrices[code];
            
            // 등락률 안전 계산
            const changeRate = stock ? (parseFloat(String(stock.changeRate)) || 0) : 0;
            const price = stock ? (parseFloat(String(stock.price)) || 0) : 0;
            const change = stock ? (parseFloat(String(stock.change)) || 0) : 0;

            const isUp = changeRate > 0;
            const isDown = changeRate < 0;
            const colorClass = isUp ? 'text-[#F04452]' : (isDown ? 'text-[#3182F6]' : 'text-slate-400');
            const sign = isUp ? '+' : '';

            return (
              <Link 
                key={code} 
                to={`/stock/${code}`}
                className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/10"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[14px] font-bold text-slate-200 group-hover:text-white truncate flex-1 leading-tight">
                    {stock?.name || '로딩 중...'}
                  </span>
                  <span className="text-[14px] font-bold text-white font-mono leading-tight">
                    {price > 0 ? price.toLocaleString() : '---'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[10px] text-slate-500 font-bold tracking-wider">
                    {code}
                  </span>
                  <div className={`flex items-center gap-2 text-[12px] font-bold ${colorClass}`}>
                    <span className="font-mono">{sign}{change.toLocaleString()}</span>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded-md font-mono min-w-[55px] text-right">
                      {sign}{changeRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WatchlistSidebar;
