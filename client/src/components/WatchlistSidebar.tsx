import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface WatchlistSidebarProps {
  favoritedStocks: string[];
  stockPrices: Record<string, any>;
  onFavoriteToggle: (code: string) => void;
}

const WatchlistSidebar = ({ favoritedStocks, stockPrices, onFavoriteToggle }: WatchlistSidebarProps) => {
  return (
    <div className="w-full flex flex-col bg-[#0a0c10] h-full">
      <div className="p-4 border-b border-white/5 shrink-0 flex justify-between items-center bg-[#0a0c10]">
        <h2 className="text-sm font-bold text-white">관심 종목</h2>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full">
          {favoritedStocks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar p-2">
        <div className="flex flex-col gap-1 w-full">
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
                <div key={code} className="relative group">
                  <Link 
                    to={`/stock/${code}`}
                    className="flex flex-col gap-0.5 py-1.5 px-3 pr-8 rounded-lg hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/10 block w-full"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate flex-1 leading-none">
                        {stock?.name || code}
                      </span>
                      <span className="text-[13px] font-bold text-white font-mono leading-none">
                        {price > 0 ? price.toLocaleString() : '---'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold tracking-tight">
                        {code}
                      </span>
                      <div className={`flex items-center gap-1.5 text-[11px] font-bold ${colorClass}`}>
                        <span className="font-mono text-[10px]">{sign}{change.toLocaleString()}</span>
                        <span className="bg-white/5 px-1 py-0.5 rounded-md font-mono min-w-[48px] text-right text-[10px]">
                          {sign}{changeRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                  {/* 삭제 버튼 - 위치 조정 */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFavoriteToggle(code);
                    }}
                    className="absolute right-1 top-1.5 p-1 rounded-md text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
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
