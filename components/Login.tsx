
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LayoutDashboard, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { ThemeType } from '../App';

interface LoginProps { theme?: ThemeType; }

const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUsername = (input: string) => {
    return input.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, "");
  };

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return "Usuário ou senha incorretos. Verifique suas credenciais.";
      case 'auth/user-disabled':
        return "Esta conta foi desativada. Entre em contato com a gerência.";
      case 'auth/too-many-requests':
        return "Muitas tentativas falhas. Tente novamente em alguns minutos.";
      case 'auth/network-request-failed':
        return "Falha na conexão. Verifique se você está conectado à internet.";
      default:
        return "Ocorreu um erro inesperado ao tentar acessar o sistema.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true); 
    setError(null);

    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) { 
      loginEmail = `${normalizeUsername(loginEmail)}@ompro.com.br`; 
    }

    try { 
      await signInWithEmailAndPassword(auth, loginEmail, password); 
    } 
    catch (err: any) { 
      console.error("Erro no Login:", err.code);
      setError(getFirebaseErrorMessage(err.code));
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 transition-colors">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
          <div className="p-10 pb-4 text-center">
            <div className="inline-flex p-5 bg-blue-600 rounded-3xl mb-6 shadow-xl shadow-blue-100 dark:shadow-none"><LayoutDashboard className="w-10 h-10 text-white" /></div>
            <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter uppercase">OmPro Live</h2>
            <p className="text-zinc-500 mt-2 font-medium italic">Gestão operacional inteligente.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase border border-rose-100 dark:border-rose-900/50 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Usuário</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" size={20} />
                  <input 
                    type="text" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:border-blue-600 outline-none font-bold text-black dark:text-white" 
                    placeholder="usuario.exemplo" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" size={20} />
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:border-blue-600 outline-none font-bold text-black dark:text-white" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 transition-all"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Autenticando...</>
              ) : (
                "Acessar Sistema"
              )}
            </button>
          </form>
          <div className="p-8 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 text-center"><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">OmPro &copy; {new Date().getFullYear()}</p></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
