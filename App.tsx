
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Grupo } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import Overview from './components/Overview';
import { Loader2, Menu, User as UserIcon, Circle } from 'lucide-react';

export type ViewType = 'dashboard' | 'tarefas' | 'usuarios' | 'relatorios';
export type ThemeType = 'light' | 'dark';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('ompro-theme');
    return (saved === 'dark' || saved === 'light') ? saved as ThemeType : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ompro-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.role === 'executor' && currentView === 'dashboard') {
              setCurrentView('tarefas');
            }
            setLoading(false);
          } else {
            alert("Erro crítico: Seu perfil de acesso não foi encontrado no banco de dados.");
            signOut(auth);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }, (error) => {
          console.error("Erro ao ouvir perfil:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [currentView]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'grupos'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Grupo));
      setGrupos(gList);
      if (gList.length > 0 && !activeGroupId) {
        setActiveGroupId(gList[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-black dark:text-zinc-400 font-black uppercase tracking-widest text-[10px]">Sincronizando Dados...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login theme={theme} />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': 
        return profile.role === 'executor' ? (
          <Dashboard 
            profile={profile} 
            grupos={grupos} 
            activeGroupId={activeGroupId} 
            setActiveGroupId={setActiveGroupId}
          />
        ) : (
          <Overview grupos={grupos} profile={profile} />
        );
      case 'usuarios': return <UserManagement profile={profile} />;
      case 'relatorios': return <Reports grupos={grupos} />;
      case 'tarefas':
      default: return (
        <Dashboard 
          profile={profile} 
          grupos={grupos} 
          activeGroupId={activeGroupId} 
          setActiveGroupId={setActiveGroupId}
        />
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-zinc-950 overflow-hidden relative transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-black dark:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="font-black text-blue-600 tracking-tighter uppercase">OmPro</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-gray-100 dark:border-zinc-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-tighter truncate max-w-[80px]">
            {profile.name.split(' ')[0]}
          </span>
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          profile={profile} 
          currentView={currentView} 
          theme={theme}
          toggleTheme={toggleTheme}
          setView={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 md:pt-0 custom-scrollbar relative">
        {/* Desktop User Header */}
        <header className="hidden md:flex items-center justify-end px-8 py-4 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-zinc-900">
          <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Status</span>
                <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded">
                   <Circle size={6} className="fill-emerald-500 text-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Online</span>
                </div>
              </div>
              <span className="text-sm font-black text-black dark:text-white uppercase tracking-tight mt-1">{profile.name}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-none transition-transform hover:rotate-6">
              <UserIcon size={20} />
            </div>
          </div>
        </header>

        {renderView()}
      </main>
    </div>
  );
};

export default App;
