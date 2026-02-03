import React from 'react';

const WatchlistSidebar = () => {
  // Placeholder data
  const watchlist = [
    { name: '삼성전자', change: '+1.2%', status: 'up' },
    { name: '카카오', change: '-0.5%', status: 'down' },
    { name: 'NAVER', change: '+2.8%', status: 'up' },
    { name: '현대차', change: '0.0%', status: 'flat' },
  ];

  return (
    <aside className="w-full md:w-max shrink-0 bg-[#0E1013] md:border-l md:border-white/5 p-4 overflow-hidden">
      <div className="md:sticky md:top-4">
        <h2 className="text-lg font-bold text-slate-100 mb-3">관심 종목</h2>
        <div className="md:h-[calc(100vh-12rem)] overflow-y-auto no-scrollbar p-2 border border-white/10 rounded-lg bg-[#121418]">
          {watchlist.map((stock, index) => (
            <div
              key={index}
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
                {stock.status === 'up' ? '▲' : stock.status === 'down' ? '▼' : ''} {stock.change}
              </span>
            </div>
          ))}
          {/* Add more placeholder items if needed to test scroll */}
        </div>
      </div>
    </aside>
  );
};

export default WatchlistSidebar;
