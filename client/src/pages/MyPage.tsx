import React, { useState, useEffect } from 'react';
import { User, LogOut, ChevronRight, Settings, Bell, HelpCircle, MessageCircle, Edit2, Check, X, Star, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface MyPageProps {
  user: any;
  handleLogout: () => void;
  onLoginClick?: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ user, handleLogout, onLoginClick }) => {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.nickname) {
      setNickname(user.user_metadata.nickname);
    } else if (user?.email) {
      setNickname(user.email.split('@')[0]);
    }
  }, [user]);

  const updateNickname = async () => {
    if (!nickname.trim()) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: nickname.trim() }
      });
      if (error) throw error;
      setIsEditingNickname(false);
      alert('닉네임이 변경되었습니다.');
    } catch (e: any) {
      alert('변경 실패: ' + e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6 bg-[#f0f3f7]">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-900/10 border border-white">
          <User className="w-10 h-10 text-slate-200" />
        </div>
        <div className="max-w-xs text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter">로그인이 필요합니다</h2>
          <p className="text-xs text-slate-500 font-medium">나만의 맞춤형 정보를 <br/>로그인 후 확인해 보세요.</p>
        </div>
        <button 
          onClick={onLoginClick} 
          className="w-full max-w-[200px] py-3.5 bg-slate-900 rounded-2xl font-black text-white shadow-lg shadow-slate-900/30 hover:bg-black active:scale-95 transition-all text-xs"
        >
          LOGIN
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#edf0f3] overflow-y-auto no-scrollbar pb-24 p-0">
      {/* Container - 추천/뉴스 페이지와 동일한 px-4 적용 */}
      <div className="max-w-4xl mx-auto px-4 md:px-10">
        
        {/* Profile Section - Compact Card Style */}
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0 border-2 border-white">
            {nickname?.[0]?.toUpperCase() || user.email?.[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              {isEditingNickname ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input 
                    type="text" 
                    value={nickname} 
                    onChange={e => setNickname(e.target.value)}
                    className="flex-1 bg-slate-50 border-2 border-indigo-500 rounded-lg px-2.5 h-8 text-xs outline-none font-bold text-slate-900"
                    autoFocus
                  />
                  <button onClick={updateNickname} disabled={isUpdating} className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg active:scale-90 transition-all shrink-0">
                    {isUpdating ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14}/>}
                  </button>
                  <button onClick={() => setIsEditingNickname(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg shrink-0">
                    <X size={14}/>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 truncate">{nickname}님</h2>
                  <button onClick={() => setIsEditingNickname(true)} className="p-1 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-md border border-slate-100 shadow-sm">
                    <Edit2 size={10} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-indigo-50 text-[8px] font-black text-indigo-600 rounded uppercase border border-indigo-100">Premium</span>
                <p className="text-[11px] text-slate-400 font-bold truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 active:scale-90 transition-all border border-slate-100 shadow-sm shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Area - Space Adjusted */}
        <div className="mt-6 space-y-6">
          {/* Status Grid */}
          <section>
            <h3 className="px-1 py-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Activity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                  <Star size={18} fill="currentColor" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Watchlist</span>
                  <span className="block text-xs font-black text-slate-900 leading-tight">ACTIVE</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <MessageCircle size={18} fill="currentColor" />
                </div>
                <div className="min-w-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Chat Profile</span>
                  <span className="block text-xs font-black text-indigo-600 truncate leading-tight uppercase">{nickname}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Menu List */}
          <section>
            <h3 className="px-1 py-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Settings</h3>
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
              {[
                { icon: <Settings className="w-4 h-4 text-indigo-500" />, label: '회원 정보 수정' },
                { icon: <Bell className="w-4 h-4 text-orange-500" />, label: '실시간 알림 설정' },
                { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, label: '보안 및 2차 인증' },
                { icon: <HelpCircle className="w-4 h-4 text-purple-500" />, label: '자주 묻는 질문' },
                { icon: <MessageCircle className="w-4 h-4 text-pink-500" />, label: '1:1 고객 센터' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-all group">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-xs group-hover:bg-white transition-all shrink-0">{item.icon}</div>
                  <span className="flex-1 text-[13px] font-bold text-slate-700 tracking-tight">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-all" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Version Tag */}
        <div className="mt-12 mb-8 text-center">
          <p className="text-[8px] text-slate-300 font-black font-mono tracking-widest uppercase opacity-50 italic">StockMate Engine v1.2.5-ELITE</p>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
