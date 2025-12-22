
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { UserPlus, Trash2, Shield, User as UserIcon, Loader2, HardHat, ShieldCheck } from 'lucide-react';

const UserManagement: React.FC<{ profile: UserProfile }> = ({ profile: currentUserProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('executor');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePlaceholderUser = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Para criar usuários reais, você deve usar o Firebase Auth. Este formulário apenas cria o perfil no Firestore. O usuário ainda precisará se registrar com este e-mail.");
    
    // Na prática, um Gerente usaria uma Cloud Function ou Admin SDK para criar o Auth.
    // Aqui simulamos a criação do perfil.
    try {
      // Usamos um ID determinístico ou deixamos o Auth criar depois
      const id = newEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'users', id), {
        uid: id,
        name: newName,
        email: newEmail,
        role: newRole
      });
      setShowAdd(false);
      setNewName('');
      setNewEmail('');
    } catch (err) {
      alert("Erro ao criar perfil de usuário.");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case 'gerente': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Gerente</span>;
      case 'administrador': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Admin</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Executor</span>;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
          <p className="text-gray-500 text-sm">Controle quem acessa o sistema e seus níveis de permissão.</p>
        </div>
        {currentUserProfile.role === 'gerente' && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            <UserPlus size={20} />
            Novo Usuário
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleCreatePlaceholderUser} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              placeholder="Nome do Usuário"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input 
              placeholder="E-mail"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select 
              value={newRole}
              onChange={e => setNewRole(e.target.value as UserRole)}
              className="p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="executor">Perfil: Executor</option>
              <option value="administrador">Perfil: Administrador</option>
              <option value="gerente">Perfil: Gerente</option>
            </select>
            <button className="bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Adicionar Perfil</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Perfil</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <UserIcon size={16} />
                    </div>
                    <span className="font-semibold text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                <td className="px-6 py-4 text-right">
                  {currentUserProfile.role === 'gerente' && u.email !== currentUserProfile.email && (
                    <button 
                      onClick={async () => { if(confirm("Excluir este perfil?")) await deleteDoc(doc(db, 'users', u.uid)) }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
      </div>
    </div>
  );
};

export default UserManagement;
