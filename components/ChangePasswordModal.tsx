
import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import { X, Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("As novas senhas não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    if (user && user.email) {
      try {
        // Reautenticação é necessária para operações sensíveis como trocar senha
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Atualiza a senha
        await updatePassword(user, newPassword);
        
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (err: any) {
        console.error("Erro ao trocar senha:", err.code);
        if (err.code === 'auth/wrong-password') {
          setError("Senha atual incorreta.");
        } else {
          setError("Erro ao atualizar senha. Tente novamente.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
        <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter">Segurança</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Alterar sua senha</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {success ? (
            <div className="py-10 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-black text-black dark:text-white uppercase text-sm tracking-tight">Senha alterada com sucesso!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase border border-rose-100 dark:border-rose-900/50">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Senha Atual</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" size={18} />
                    <input 
                      type="password" 
                      required 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:border-blue-600 outline-none font-bold text-black dark:text-white text-sm" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-zinc-800 my-2" />

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" size={18} />
                    <input 
                      type="password" 
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:border-blue-600 outline-none font-bold text-black dark:text-white text-sm" 
                      placeholder="Nova senha (min. 6 carac.)" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" size={18} />
                    <input 
                      type="password" 
                      required 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:border-blue-600 outline-none font-bold text-black dark:text-white text-sm" 
                      placeholder="Confirme a nova senha" 
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
                  <><Loader2 className="animate-spin" size={20} /> Processando...</>
                ) : (
                  "Salvar Nova Senha"
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
