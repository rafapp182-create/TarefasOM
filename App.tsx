
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
import { Loader2, Menu } from 'lucide-react';

export type ViewType = 'dashboard' | 'tarefas' | 'usuarios' | 'relatorios';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Ouvinte em tempo real para o perfil do usuário
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            // Se for executor, força a visão de tarefas se estiver no dashboard
            if (data.role === 'executor' && currentView === 'dashboard') {
              setCurrentView('tarefas');
            }
            setLoading(false);
          } else {
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-black font-medium">Sincronizando acesso...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
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
          <Overview grupos={grupos} />
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
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg text-black"
          >
            <Menu size={24} />
          </button>
          <span className="font-black text-blue-600 tracking-tighter uppercase">OmPro</span>
        </div>
        <div className="text-[10px] font-black text-black uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
          {profile.role}
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          profile={profile} 
          currentView={currentView} 
          setView={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
