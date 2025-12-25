
import React from 'react';
import { UserProfile } from '../types';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Users, FileBarChart, LogOut, ShieldCheck, HardHat, UserRound, X, LayoutGrid, Sun, Moon, Key } from 'lucide-react';
import { ViewType, ThemeType } from '../App';

interface SidebarProps {
  profile: UserProfile;
  currentView: ViewType;
  theme: ThemeType;
  toggleTheme: () => void;
  setView: (view: ViewType) => void;
  onClose?: () => void;
  onChangePassword: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ profile, currentView, theme, toggleTheme, setView, onClose, onChangePassword }) => {
  const isExecutor = profile.role === 'executor';

  const getRoleIcon = () => {
    switch(profile.role) {
      case 'gerente': return <ShieldCheck className="text-purple-600 dark:text-purple-400" />;
      case 'administrador': return <ShieldCheck className="text-blue-600 dark:text-blue-400" />;
      case 'executor': return <HardHat className="text-orange-600 dark:text-orange-400" />;
      default: return <UserRound />;
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema OmPro?")) {
      try {
        await signOut(auth);
        localStorage.removeItem('ompro-theme');
        window.location.reload();
      } catch (error) {
        console.error("Erro ao deslogar:", error);
      }
    }
  };

  return (
    <div className="w-72 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shadow-2xl md:shadow-none overflow-y-auto transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-zinc-800 relative shrink-0">
        <button 
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 p-2 text-black dark:text-white hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 dark:shadow-none">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-black dark:text-white uppercase leading-none">OmPro</h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none mt-1">Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm border border-gray-200 dark:border-zinc-600 shrink-0">
            {getRoleIcon()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black text-black dark:text-white truncate leading-tight uppercase tracking-tight">{profile.name}</p>
            <p className="text-[10px] text-black dark:text-zinc-400 font-bold uppercase tracking-widest mt-1 opacity-80">{profile.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 min-h-0 overflow-y-auto no-scrollbar">
        {!isExecutor && (
          <NavItem 
            icon={<LayoutGrid size={20} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setView('dashboard')}
          />
        )}
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Tarefas" 
          active={currentView === 'tarefas' || (isExecutor && currentView === 'dashboard')} 
          onClick={() => setView('tarefas')}
        />
        {(profile.role === 'gerente' || profile.role === 'administrador') && (
          <NavItem 
            icon={<FileBarChart size={20} />} 
            label="Relatórios" 
            active={currentView === 'relatorios'}
            onClick={() => setView('relatorios')}
          />
        )}
        {(profile.role === 'gerente' || profile.role === 'administrador') && (
          <NavItem 
            icon={<Users size={20} />} 
            label="Usuários" 
            active={currentView === 'usuarios'}
            onClick={() => setView('usuarios')}
          />
        )}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-2 shrink-0">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-zinc-800 text-black dark:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs border border-gray-200 dark:border-zinc-700"
        >
          {theme === 'light' ? (
            <><Moon size={20} className="text-indigo-500" /> Tema Escuro</>
          ) : (
            <><Sun size={20} className="text-amber-500" /> Tema Claro</>
          )}
        </button>

        <button 
          onClick={onChangePassword}
          className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-zinc-800 text-black dark:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs border border-gray-200 dark:border-zinc-700 hover:border-blue-500/50"
        >
          <Key size={20} className="text-blue-600 dark:text-blue-400" />
          Alterar Senha
        </button>

        <button 
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all font-black uppercase tracking-widest text-xs"
        >
          <LogOut size={20} />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-xs ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 dark:shadow-none' : 'text-black dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
  >
    <div className={active ? 'scale-110' : ''}>{icon}</div>
    <span>{label}</span>
  </button>
);

export default Sidebar;
