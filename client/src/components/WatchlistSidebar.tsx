import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface WatchlistSidebarProps {
  favoritedStocks: string[];
  stockPrices: Record<string, any>;
  onFavoriteToggle: (code: string) => void;
}

const WatchlistSidebar = ({ favoritedStocks, stockPrices, onFavoriteToggle }: WatchlistSidebarProps) => {
  return (
    <div className="w-full flex flex-col h-full bg-transparent">
      <div className="p-4 border-b border-slate-300/40 shrink-0 flex justify-between items-center bg-slate-100/10">
        <h2 className="text-[13px] font-black text-slate-600 uppercase tracking-tight">Watchlist</h2>
        <span className="text-[10px] text-indigo-600 font-black bg-indigo-50/50 px-2 py-0.5 rounded-full border border-indigo-100/50 shadow-sm">
          {favoritedStocks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-1.5 bg-transparent">
        <div className="flex flex-col gap-0.5 w-full">
          {favoritedStocks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100/50 flex items-center justify-center text-slate-200 border border-slate-300/50 shadow-inner">❤</div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Empty</p>
            </div>
          ) : (
            favoritedStocks.map((code) => {
              const stock = stockPrices[code];
              
              // 데이터 안전 처리
              const changeRate = stock ? (parseFloat(String(stock.changeRate)) || 0) : 0;
              const price = stock ? (parseFloat(String(stock.price)) || 0) : 0;
              const change = stock ? (parseFloat(String(stock.change)) || 0) : 0;

              const isUp = changeRate > 0;
              const isDown = changeRate < 0;
              const colorClass = isUp ? 'text-rose-500' : (isDown ? 'text-blue-600' : 'text-slate-400');
              const sign = isUp ? '+' : '';

              return (
                <div key={code} className="relative group">
                  <Link 
                    to={`/stock/${code}`}
                    className="flex flex-col gap-0.5 py-1.5 px-3 pr-10 rounded-xl hover:bg-white/60 transition-all border border-transparent hover:border-white/20 block w-full group-active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] font-black text-slate-700 group-hover:text-indigo-600 truncate flex-1 leading-tight tracking-tight">
                        {stock?.name || code}
                      </span>
                      <span className="text-[13px] font-black text-slate-800 font-mono leading-tight tracking-tighter">
                        {price > 0 ? price.toLocaleString() : '---'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 font-black tracking-tighter opacity-50">
                        {code}
                      </span>
                      <div className={`flex items-center gap-1.5 text-[11px] font-black ${colorClass}`}>
                        <span className="font-mono text-[9px] opacity-70">{sign}{change.toLocaleString()}</span>
                        <span className="bg-white/30 px-1 py-0.5 rounded border border-current/10 font-mono min-w-[44px] text-right text-[10px] tracking-tighter">
                          {sign}{changeRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  {/* 삭제 버튼 - 시인성 강화 */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFavoriteToggle(code);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm active:scale-90 bg-white/60"
                    title="관심 종목 해제"
                  >
                    <X size={14} strokeWidth={3} />
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
