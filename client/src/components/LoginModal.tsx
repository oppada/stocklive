import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal = ({ onClose }: LoginModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setMessage('이메일 또는 비밀번호가 일치하지 않습니다.');
      } else {
        setMessage(error.message);
      }
    } else {
      onClose();
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          nickname: email.split('@')[0]
        }
      }
    });

    if (error) {
      setMessage(`회원가입 실패: ${error.message}`);
    } else if (data.user && data.session) {
      setMessage('회원가입 성공! 로그인되었습니다.');
      setTimeout(() => onClose(), 1500);
    } else {
      setMessage('가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요!');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-300 p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-8 text-slate-800">로그인</h2>
        <form className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider px-1">이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider px-1">비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all" placeholder="••••••••" />
          </div>
          {message && <p className="text-xs text-red-600 font-bold px-1">{message}</p>}
          <div className="flex flex-col gap-3 pt-4">
            <button onClick={handleLogin} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-bold text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">로그인</button>
            <button onClick={handleSignUp} disabled={isLoading} className="w-full bg-slate-100 hover:bg-slate-200 py-4 rounded-2xl font-bold text-slate-600 active:scale-[0.98] transition-all">회원가입</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
