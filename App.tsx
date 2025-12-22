
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Grupo } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import { Loader2 } from 'lucide-react';

export type ViewType = 'tarefas' | 'usuarios' | 'relatorios';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('tarefas');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        <p className="text-gray-600 font-medium">Carregando sistema...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'usuarios': return <UserManagement profile={profile} />;
      case 'relatorios': return <Reports grupos={grupos} />;
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar profile={profile} currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
