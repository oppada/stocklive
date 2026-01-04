import React, { useState } from 'react';
import { 
  Search, Bell, User, MessageCircle, TrendingUp, 
  Home, PieChart, Newspaper, Zap, Send 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 정보를 가져옵니다.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App = () => {
  const [activeTab, setActiveTab] = useState('홈');
  const [messages, setMessages] = useState([
    { id: 1, user: '운영자', text: '반갑습니다! 실시간 정보를 공유하세요.', time: '오후 3:00' }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const newMessage = {
      id: Date.now(),
      user: '나',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const renderContent = () => {
    switch (activeTab) {
      case '홈':
        return (
          <section className="space-y-8">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-white">
              <TrendingUp className="text-neon-red" /> 이슈 테마 순위
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['AI 반도체', '초전도체', '자율주행', '저PBR'].map((name, i) => (
                <div key={i} className="bg-card-bg p-5 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg text-white">{name}</span>
                    <span className="text-neon-red font-bold">+{5.2 + i}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">관련주: 한미반도체, SK하이닉스 등</p>
                </div>
              ))}
            </div>
          </section>
        );
      case '톡':
        return (
          <div className="flex flex-col h-full bg-slate-950 -m-4 md:hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.user === '나' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] text-slate-500 mb-1">{m.user}</span>
                  <div className={`p-3 rounded-2xl max-w-[80%] ${m.user === '나' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="메시지 입력..." 
                className="flex-1 bg-slate-900 rounded-xl px-4 py-2 text-sm outline-none border border-slate-800 text-white"
              />
              <button type="submit" className="bg-blue-600 p-2 rounded-xl text-white"><Send className="w-4 h-4" /></button>
            </form>
          </div>
        );
      default:
        return <div className="flex items-center justify-center h-full text-slate-500">{activeTab} 화면 준비 중...</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-primary-bg text-slate-100 font-sans">
      {/* 1. 상단 헤더 (PC 메뉴 복구) */}
      <header className="h-14 md:h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 bg-primary-bg z-30">
        <div className="flex items-center gap-4">
          <h1 className="text-lg md:text-xl font-black tracking-tighter text-white cursor-pointer" onClick={() => setActiveTab('홈')}>STOCKLIVE</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-400">
            <button onClick={() => setActiveTab('홈')} className={`${activeTab === '홈' ? 'text-white' : 'hover:text-white'}`}>홈</button>
            <button onClick={() => setActiveTab('추천')} className={`${activeTab === '추천' ? 'text-white' : 'hover:text-white'}`}>추천</button>
            <button onClick={() => setActiveTab('테마')} className={`${activeTab === '테마' ? 'text-white' : 'hover:text-white'}`}>테마</button>
            <button onClick={() => setActiveTab('뉴스')} className={`${activeTab === '뉴스' ? 'text-white' : 'hover:text-white'}`}>뉴스</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-400" />
          <User className="w-5 h-5 text-slate-400" />
        </div>
      </header>

      {/* 2. 실시간 티커 (속도는 CSS에서 조절됨) */}
      <div className="h-9 md:h-10 bg-slate-900/50 border-b border-slate-800 flex items-center overflow-hidden shrink-0">
        <div className="animate-marquee whitespace-nowrap flex text-[12px] md:text-sm text-slate-300">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 삼성전자 <span className="text-neon-red">72,500 (+1.2%)</span></span>
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" /> SK하이닉스 <span className="text-neon-red">182,000 (+3.5%)</span></span>
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" /> 현대차 <span className="text-neon-blue">252,000 (-0.8%)</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PC용 사이드바 채팅 */}
        <aside className="hidden md:flex w-[320px] border-r border-slate-800 flex-col shrink-0 bg-primary-bg">
          <div className="p-4 border-b border-slate-800 font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-neon-blue" /> 실시간 톡</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-bold text-slate-400 mr-2">{m.user}:</span>
                <span className="text-slate-200">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 rounded-lg px-3 py-2 text-xs outline-none border border-slate-800 text-white" 
              placeholder="채팅 입력..." 
            />
          </form>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>

      {/* 4. 하단 네비바 (톡 강조 및 색상 수정) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 border-t border-slate-800 flex items-center justify-around z-50">
        {[
          { name: '홈', icon: <Home className="w-5 h-5" /> },
          { name: '추천', icon: <PieChart className="w-5 h-5" /> },
          { name: '톡', icon: <MessageCircle className="w-5 h-5" />, special: true },
          { name: '탐색', icon: <Search className="w-5 h-5" /> },
          { name: '뉴스', icon: <Newspaper className="w-5 h-5" /> },
        ].map((item) => (
          <button 
            key={item.name}
            onClick={() => setActiveTab(item.name)}
            className={`flex flex-col items-center gap-1 min-w-[64px] ${activeTab === item.name && !item.special ? 'text-white' : 'text-slate-500'}`}
          >
            {item.special ? (
              <div className={`-top-1 relative p-2 rounded-xl transition-all ${activeTab === '톡' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {item.icon}
              </div>
            ) : item.icon}
            <span className={`text-[10px] ${activeTab === item.name ? 'text-white font-bold' : ''}`}>{item.name}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};

export default App;