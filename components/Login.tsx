
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LayoutDashboard, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUsername = (input: string) => {
    return input.trim().toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let loginEmail = email.trim();
    
    // Se não for um e-mail completo, converte o nome em e-mail técnico
    if (!loginEmail.includes('@')) {
      const slug = normalizeUsername(loginEmail);
      loginEmail = `${slug}@ompro.com.br`;
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Nome de usuário ou senha incorretos.");
      } else {
        setError("Erro ao acessar o sistema. Tente novamente.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="p-10 pb-4 text-center">
            <div className="inline-flex p-5 bg-blue-600 rounded-3xl mb-6 shadow-xl shadow-blue-100">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">OmPro Live</h2>
            <p className="text-gray-400 mt-2 font-medium italic">
              Acesse o quadro vivo de tarefas
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-rose-100 animate-shake">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário ou E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-600 outline-none font-bold transition-all"
                    placeholder="Ex: joao.silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-600 outline-none font-bold transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Entrar no Sistema"}
            </button>
            
            <div className="pt-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] leading-relaxed">
                Não tem acesso? <br/>
                <span className="text-blue-600">Solicite uma conta com um gerente ou administrador</span>
              </p>
            </div>
          </form>
          
          <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Sistema OmPro &copy; {new Date().getFullYear()}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
