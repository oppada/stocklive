import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface WatchlistSidebarProps {
  favoritedStocks: string[];
  stockPrices: Record<string, any>;
  onFavoriteToggle: (code: string) => void;
}

const WatchlistSidebar = ({ favoritedStocks, stockPrices, onFavoriteToggle }: WatchlistSidebarProps) => {
  return (
    <div className="w-full flex flex-col bg-white h-full shadow-inner">
      <div className="p-4 border-b border-slate-100 shrink-0 flex justify-between items-center bg-white">
        <h2 className="text-sm font-bold text-slate-800">관심 종목</h2>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-full">
          {favoritedStocks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar p-2">
        <div className="flex flex-col gap-1 w-full">
          {favoritedStocks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 text-lg">❤</div>
              <p className="text-[12px] text-slate-400 font-medium">관심 종목이 없습니다.</p>
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
              const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-500' : 'text-slate-400');
              const sign = isUp ? '+' : '';

              return (
                <div key={code} className="relative group">
                  <Link 
                    to={`/stock/${code}`}
                    className="flex flex-col gap-0.5 py-2 px-3 pr-8 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 block w-full"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-700 group-hover:text-blue-600 truncate flex-1 leading-none">
                        {stock?.name || code}
                      </span>
                      <span className="text-[13px] font-bold text-slate-900 font-mono leading-none">
                        {price > 0 ? price.toLocaleString() : '---'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 font-bold tracking-tight">
                        {code}
                      </span>
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold ${colorClass}`}>
                        <span className="font-mono text-[10px]">{sign}{change.toLocaleString()}</span>
                        <span className="bg-slate-50 px-1 py-0.5 rounded-md font-mono min-w-[48px] text-right text-[10px]">
                          {sign}{changeRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFavoriteToggle(code);
                    }}
                    className="absolute right-1 top-2 p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="관심 종목 해제"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistSidebar;
