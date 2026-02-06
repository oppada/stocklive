import { useState, useEffect } from 'react';

// KIS_APP_KEY and KIS_APP_SECRET are no longer needed in this reverted version
// interface KisToken is no longer needed

interface InvestorData {
  rank: number;
  name: string;
  fluctuationRate: string;
  tradeValue: string;
}

const InvestorCategory = ({ investorTab }: { investorTab: string }) => {
  const [foreignersData, setForeignersData] = useState<InvestorData[]>([]);
  const [institutionsData, setInstitutionsData] = useState<InvestorData[]>([]);
  const [individualsData, setIndividualsData] = useState<InvestorData[]>([]);
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
    const generateMockData = (prefix: string): InvestorData[] => {
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

  const renderColumn = (title: string, data: InvestorData[]) => (
    <div className="flex-1 border-r border-white/5 last:border-r-0">
      <h3 className="text-lg font-bold text-center mb-1">{title}</h3>
      <div className="text-[9px] sm:text-[11px] font-bold text-slate-400 grid grid-cols-[0.7fr_2fr_1fr_1.3fr] gap-x-2 px-2 pb-1 border-b border-white/10">
        <span>순위</span>
        <span>종목명</span>
        <span className="text-right">등락률</span>
        <span className="text-right">거래대금</span>
      </div>
      <div className="mt-2 space-y-2">
        {data.slice(0, isMobile ? 20 : 50).map((item) => ( // Truncate to 20 items for mobile
          <div key={item.rank} className="grid grid-cols-[0.7fr_2fr_1fr_1.3fr] gap-x-2 px-2 text-sm">
            <span className="text-[14px] font-bold text-slate-400">{item.rank}</span>
            <span className="font-bold text-xs sm:text-[16px] text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
            <span className={`text-right text-[11px] sm:text-[13px] ${parseFloat(item.fluctuationRate) < 0 ? 'text-blue-500' : 'text-rose-500'}`}>{item.fluctuationRate}</span>
            <span className="text-right text-[10px] sm:text-[12px] text-slate-500 font-medium">{item.tradeValue}</span>
          </div>
        ))}
      </div>
    </div>
  );



  if (foreignersData.length === 0 && institutionsData.length === 0 && individualsData.length === 0) {
    return <div className="p-4 text-center">데이터가 없습니다.</div>;
  }

  return (
    <div className="px-4 pt-2">
      <div className="flex flex-col gap-4 md:flex-row">
        {renderColumn('외국인', foreignersData)}
        {renderColumn('기관', institutionsData)}
        {renderColumn('개인', individualsData)}
      </div>
    </div>
  );
};

export default InvestorCategory;
