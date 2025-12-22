
import React from 'react';
import { UserProfile } from '../types';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Users, FileBarChart, LogOut, ShieldCheck, HardHat, UserRound, X, LayoutGrid } from 'lucide-react';
import { ViewType } from '../App';

interface SidebarProps {
  profile: UserProfile;
  currentView: ViewType;
  setView: (view: ViewType) => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ profile, currentView, setView, onClose }) => {
  const getRoleIcon = () => {
    switch(profile.role) {
      case 'gerente': return <ShieldCheck className="text-purple-600" />;
      case 'administrador': return <ShieldCheck className="text-blue-600" />;
      case 'executor': return <HardHat className="text-orange-600" />;
      default: return <UserRound />;
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema OmPro?")) {
      try {
        await signOut(auth);
        // O onAuthStateChanged no App.tsx detectará a mudança e voltará para o Login automaticamente
      } catch (error) {
        console.error("Erro ao deslogar:", error);
        alert("Erro ao sair. Tente novamente.");
      }
    }
  };

  return (
    <div className="w-72 h-full bg-white border-r border-gray-200 flex flex-col shadow-2xl md:shadow-none overflow-y-auto">
      <div className="p-6 border-b border-gray-100 relative shrink-0">
        <button 
          onClick={onClose}
          className="md:hidden absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-gray-900 uppercase">OmPro</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
            {getRoleIcon()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black text-gray-900 truncate leading-tight uppercase tracking-tight">{profile.name}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{profile.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4 min-h-0 overflow-y-auto">
        <NavItem 
          icon={<LayoutGrid size={20} />} 
          label="Dashboard" 
          active={currentView === 'dashboard'} 
          onClick={() => setView('dashboard')}
        />
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Tarefas" 
          active={currentView === 'tarefas'} 
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

      <div className="p-4 border-t border-gray-100 shrink-0 mb-4 md:mb-0">
        <button 
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all font-black uppercase tracking-widest text-xs outline-none cursor-pointer active:scale-95"
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
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-xs ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
  >
    <div className={active ? 'scale-110' : ''}>{icon}</div>
    <span>{label}</span>
  </button>
);

export default Sidebar;
