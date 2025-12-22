
import React from 'react';
import { UserProfile } from '../types';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Users, FileBarChart, LogOut, ShieldCheck, HardHat, UserRound } from 'lucide-react';
import { ViewType } from '../App';

interface SidebarProps {
  profile: UserProfile;
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ profile, currentView, setView }) => {
  const getRoleIcon = () => {
    switch(profile.role) {
      case 'gerente': return <ShieldCheck className="text-purple-600" />;
      case 'administrador': return <ShieldCheck className="text-blue-600" />;
      case 'executor': return <HardHat className="text-orange-600" />;
      default: return <UserRound />;
    }
  };

  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair?")) {
      signOut(auth);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">LiveTask</h1>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
            {getRoleIcon()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile.name}</p>
            <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
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

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
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
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Sidebar;
