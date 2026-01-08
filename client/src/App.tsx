import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Bell, User, MessageCircle, TrendingUp, 
  Home, PieChart, Newspaper, Zap, Send, ArrowUpRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// 1. 환경 변수 설정
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KIS_APP_KEY = import.meta.env.VITE_KIS_APP_KEY;
const KIS_APP_SECRET = import.meta.env.VITE_KIS_APP_SECRET;

const generateNickname = () => {
  const animals = ['사자', '호랑이', '독수리', '상어', '부엉이', '치타'];
  const adjs = ['용감한', '영리한', '빠른', '침착한', '날카로운', '강력한'];
  return `${adjs[Math.floor(Math.random() * adjs.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('홈');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myNickname] = useState(generateNickname());
  const [kisToken, setKisToken] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 2. 한국투자증권 Access Token 발급 함수 (404 방지용 정밀 호출)
  const fetchKisToken = async () => {
    try {
      console.log("KIS 토큰 발급 시도 중...");
      // KIS_BASE_URL 변수 대신 직접 '/uapi' 경로를 사용합니다.
      const response = await fetch('/uapi/oauth2/tokenP', {
        method: 'POST',
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          appkey: KIS_APP_KEY,
          appsecret: KIS_APP_SECRET
        })
      });

      if (!response.ok) {
        // 404 에러 시 원인 파악을 위한 텍스트 출력
        const errorData = await response.text();
        console.error(`요청 실패 (${response.status}):`, errorData);
        return;
      }

      const data = await response.json();
      if (data.access_token) {
        setKisToken(data.access_token);
        console.log("✅ KIS 토큰 발급 성공!");
      }
    } catch (error) {
      console.error("❌ KIS 연동 에러:", error);
    }
  };

  useEffect(() => {
    fetchKisToken();

    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => setMessages((prev) => [...prev, payload.new])
      ).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const newMessage = {
      user: myNickname,
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    await supabase.from('messages').insert([newMessage]);
    setInputText('');
  };

  const renderContent = () => {
    switch (activeTab) {
      case '홈':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><TrendingUp className="text-rose-500 w-5 h-5" /> 급상승 테마</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ name: 'AI 반도체', rate: '+12.5%', stock: '한미반도체' }, { name: '온디바이스 AI', rate: '+8.2%', stock: '제주반도체' }, { name: '초전도체', rate: '+5.7%', stock: '신성델타테크' }, { name: '저PBR', rate: '+4.1%', stock: '현대차' }].map((item, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded-lg text-sm">{item.rate}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-3 italic">대장주: {item.stock}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case '추천':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><PieChart className="text-blue-500 w-5 h-5" /> 전략 종목</h2>
            <div className="space-y-4">
              {[{ name: '삼성전자', change: '+1.2%', desc: 'HBM 공급 가시화에 따른 외인 매수세' }, { name: 'SK하이닉스', change: '+3.5%', desc: '엔비디아 발 AI 호재 지속 전망' }].map((item, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">{item.name} <span className="text-rose-500 text-sm ml-2">{item.change}</span></h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                  <button className="bg-white text-black p-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><ArrowUpRight className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </section>
        );
      case '뉴스':
        return (
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Newspaper className="text-emerald-500 w-5 h-5" /> 실시간 속보</h2>
            <div className="space-y-1">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="border-b border-slate-900 py-4 group cursor-pointer">
                  <h3 className="text-[15px] font-medium text-slate-200 group-hover:text-blue-400 transition-colors">[속보] 코스피 외국인 기관 '쌍끌이' 매수에 상승세 지속</h3>
                  <p className="text-[11px] text-slate-500 mt-1 flex justify-between"><span>경제통신</span><span>5분 전</span></p>
                </div>
              ))}
            </div>
          </section>
        );
      case '톡':
        return (
          <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-950 -m-4 md:hidden relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-[14px] pb-20">
              {messages.map((m, idx) => (
                <div key={idx} className="leading-relaxed break-all">
                  <span className={`font-bold mr-2 ${m.user === myNickname ? 'text-blue-400' : 'text-slate-400'}`}>{m.user}:</span>
                  <span className="text-slate-200">{m.text}</span>
                  <span className="text-[10px] text-slate-700 ml-2">{m.time}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="fixed bottom-16 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex gap-2 z-40">
              <input 
                type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="메시지 입력..." 
                className="flex-1 bg-slate-950 rounded-xl px-4 py-2 text-sm outline-none border border-slate-800 text-white"
              />
              <button type="submit" className="bg-blue-600 p-2 rounded-xl text-white"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0c10] text-slate-100 font-sans">
      <header className="h-14 md:h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0a0c10] z-30 shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black tracking-tighter text-white cursor-pointer" onClick={() => setActiveTab('홈')}>STOCK<span className="text-blue-500 italic">LIVE</span></h1>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400">
            {['홈', '추천', '뉴스', '탐색'].map((item) => (
              <button key={item} onClick={() => setActiveTab(item)} className={`${activeTab === item ? 'text-white border-b-2 border-blue-500 py-1' : 'hover:text-white'}`}>{item}</button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white" />
          <User className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white" />
        </div>
      </header>

      {/* 티커 영역 */}
      <div className="h-9 md:h-10 bg-blue-600/5 border-b border-white/5 flex items-center overflow-hidden shrink-0">
        <div className="animate-marquee whitespace-nowrap flex text-[11px] font-bold">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              <span className="flex items-center gap-1.5 text-slate-300"><Zap className="w-3 h-3 text-yellow-400" /> 삼성전자 <span className="text-rose-500">조회중...</span></span>
              <span className="flex items-center gap-1.5 text-slate-300"><Zap className="w-3 h-3 text-yellow-400" /> SK하이닉스 <span className="text-rose-500">조회중...</span></span>
              <span className="flex items-center gap-1.5 text-slate-300"><Zap className="w-3 h-3 text-yellow-400" /> 현대차 <span className="text-rose-500">조회중...</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-[340px] border-r border-white/5 flex-col bg-[#0a0c10] shrink-0">
          <div className="p-4 border-b border-white/5 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-white"><MessageCircle className="w-4 h-4 text-blue-500" /> 실시간 톡</span>
            <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${kisToken ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {kisToken ? "📡 API 연결됨" : "📡 API 연결중..."}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className="text-[13px] leading-relaxed break-all">
                <span className={`font-bold mr-2 ${m.user === myNickname ? 'text-blue-400' : 'text-slate-400'}`}>{m.user}:</span>
                <span className="text-slate-300">{m.text}</span>
                <span className="text-[10px] text-slate-800 ml-2 whitespace-nowrap">{m.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#0a0c10]">
            <div className="relative">
              <input 
                type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-900 rounded-xl px-4 py-3 text-xs outline-none border border-white/5 text-white pr-10 focus:border-blue-500 transition-colors" 
                placeholder="채팅을 입력하세요..." 
              />
              <button type="submit" className="absolute right-2 top-2.5 p-1.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500"><Send className="w-3 h-3" /></button>
            </div>
          </form>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 bg-black">
          <div className="max-w-3xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0c10] border-t border-white/5 flex items-center justify-around z-50 px-2">
        {[
          { name: '홈', icon: <Home className="w-5 h-5" /> },
          { name: '추천', icon: <PieChart className="w-5 h-5" /> },
          { name: '톡', icon: <MessageCircle className="w-5 h-5" />, special: true },
          { name: '뉴스', icon: <Newspaper className="w-5 h-5" /> },
          { name: '탐색', icon: <Search className="w-5 h-5" /> },
        ].map((item) => (
          <button 
            key={item.name} onClick={() => setActiveTab(item.name)}
            className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === item.name && !item.special ? 'text-blue-500' : 'text-slate-500'}`}
          >
            {item.special ? (
              <div className={`-top-3 relative p-3.5 rounded-2xl shadow-lg transition-all ${activeTab === '톡' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{item.icon}</div>
            ) : item.icon}
            <span className="text-[10px] font-medium">{item.name}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};

export default App;