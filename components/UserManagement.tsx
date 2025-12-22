
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { UserPlus, Trash2, User as UserIcon, Loader2, Key, Mail, ShieldAlert, AlertCircle } from 'lucide-react';

const UserManagement: React.FC<{ profile: UserProfile }> = ({ profile: currentUserProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('executor');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar usuários:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    const roleToCreate = currentUserProfile.role === 'administrador' ? 'executor' : newRole;
    setIsCreating(true);

    // Gerar um nome de app único para esta tentativa de criação
    const tempAppName = `CreationApp-${Date.now()}`;
    let secondaryApp;

    try {
      // Normalização robusta do nome para o e-mail
      const slug = newName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, '.')            // Espaços viram pontos
        .replace(/[^a-z0-9.]/g, "");     // Remove tudo que não for letra, número ou ponto

      if (!slug) throw new Error("Nome inválido para gerar login.");
      
      const technicalEmail = `${slug}@ompro.com.br`;

      // Inicializa app secundário para não deslogar o admin atual
      secondaryApp = initializeApp(firebaseConfig, tempAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Criar no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, technicalEmail, newPassword);
      const uid = userCredential.user.uid;

      // 2. Salvar Perfil no Firestore
      await setDoc(doc(db, 'users', uid), {
        uid: uid,
        name: newName,
        email: technicalEmail,
        role: roleToCreate,
        createdAt: Date.now()
      });

      // 3. Limpar
      await signOut(secondaryAuth);
      
      alert(`Usuário criado com sucesso!\n\nLOGIN: ${technicalEmail}\nSENHA: ${newPassword}\n\nForneça estes dados ao colaborador.`);
      
      setShowAdd(false);
      setNewName('');
      setNewPassword('');
    } catch (err: any) {
      console.error("Erro detalhado ao criar usuário:", err);
      let msg = "Erro ao criar usuário.";
      
      if (err.code === 'auth/email-already-in-use') {
        msg = "Este nome de usuário já está sendo usado por outro colaborador.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "O nome fornecido gerou um e-mail inválido.";
      } else if (err.code === 'auth/weak-password') {
        msg = "A senha fornecida é muito fraca.";
      } else if (err.message) {
        msg = err.message;
      }
      
      alert(msg);
    } finally {
      setIsCreating(false);
      // Sempre deletar o app temporário para liberar memória e evitar conflitos
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.warn("Erro ao limpar app temporário", e);
        }
      }
    }
  };

  const handleDeleteUser = async (userToDelete: UserProfile) => {
    if (userToDelete.uid === currentUserProfile.uid) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }

    if (currentUserProfile.role !== 'gerente') {
      alert("Apenas gerentes possuem permissão para excluir usuários.");
      return;
    }

    if (!window.confirm(`ATENÇÃO: Deseja realmente remover o acesso de ${userToDelete.name}?\nO usuário será desconectado e não poderá mais acessar o sistema.`)) {
      return;
    }

    setDeletingId(userToDelete.uid);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
    } catch (err) {
      console.error("Erro ao deletar usuário:", err);
      alert("Erro ao remover usuário. Verifique suas permissões.");
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case 'gerente': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter">Gerente</span>;
      case 'administrador': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter">Admin</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter">Executor</span>;
    }
  };

  const canCreate = currentUserProfile.role === 'gerente' || currentUserProfile.role === 'administrador';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Equipe OmPro</h2>
          <p className="text-black text-sm italic font-medium">Gestão de acessos e permissões em tempo real.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-xs"
          >
            {showAdd ? 'Cancelar' : <><UserPlus size={18} /> Novo Usuário</>}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-50 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Nome do Colaborador</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    placeholder="Ex: João Silva"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-black"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Senha de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="password"
                    placeholder="Mínimo 6 dígitos"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-black"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Nível de Permissão</label>
                {currentUserProfile.role === 'administrador' ? (
                  <div className="w-full p-4 bg-gray-100 border-2 border-gray-100 rounded-2xl font-bold text-black opacity-50 cursor-not-allowed">
                    Executor (Campo)
                  </div>
                ) : (
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer text-black"
                  >
                    <option value="executor">Executor (Campo)</option>
                    <option value="administrador">Administrador (Gestão)</option>
                    <option value="gerente">Gerente (Total)</option>
                  </select>
                )}
              </div>
            </div>
            <button 
              disabled={isCreating}
              className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isCreating ? <><Loader2 className="animate-spin" /> Criando Usuário...</> : 'Confirmar Cadastro'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-black text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Colaborador</th>
                <th className="px-8 py-6">Login de Acesso</th>
                <th className="px-8 py-6">Perfil</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-sm shrink-0">
                        {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="font-black text-black uppercase tracking-tight text-sm truncate max-w-[150px] md:max-w-none">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-black">
                      <Mail size={14} className="text-gray-300" />
                      {u.email}
                    </div>
                  </td>
                  <td className="px-8 py-6">{getRoleBadge(u.role)}</td>
                  <td className="px-8 py-6 text-right">
                    {currentUserProfile.role === 'gerente' && u.uid !== currentUserProfile.uid ? (
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingId === u.uid}
                        className="p-3 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 cursor-pointer active:scale-90"
                        title="Remover Acesso"
                      >
                        {deletingId === u.uid ? <Loader2 size={20} className="animate-spin text-rose-600" /> : <Trash2 size={20} />}
                      </button>
                    ) : (
                      u.uid === currentUserProfile.uid && (
                        <span className="p-3 text-emerald-500 bg-emerald-50 rounded-xl flex items-center justify-center gap-1 text-[10px] font-black uppercase ml-auto w-fit">
                          <ShieldAlert size={14} /> Você
                        </span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>}
        {!loading && users.length === 0 && (
          <div className="p-20 text-center text-black font-black uppercase text-xs">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
