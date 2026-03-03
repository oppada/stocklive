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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm bg-[#1A1D21] rounded-2xl border border-white/10 p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-6">Login to StockMate</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0E1013] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" placeholder="Enter your email" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0E1013] border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" placeholder="Enter your password" />
          </div>
          {message && <p className="text-xs text-rose-500">{message}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={handleLogin} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-sm transition-colors">Login</button>
            <button onClick={handleSignUp} disabled={isLoading} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold text-sm transition-colors">Sign Up</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
