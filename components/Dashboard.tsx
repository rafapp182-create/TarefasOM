
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Grupo, Task } from '../types';
import TaskCard from './TaskCard';
import { Trash2, Upload, Loader2, FileSpreadsheet, Settings2, Check, FolderPlus, AlertTriangle, List, Eraser, X, AlertOctagon, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import TaskModal from './TaskModal';

interface DashboardProps {
  profile: UserProfile;
  grupos: Grupo[];
  activeGroupId: string | null;
  setActiveGroupId: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, grupos, activeGroupId, setActiveGroupId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para Confirmação de Exclusão
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'group' | 'tasks';
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (grupos.length > 0 && activeGroupId && !grupos.find(g => g.id === activeGroupId)) {
      setActiveGroupId(grupos[0].id);
    } else if (grupos.length === 0) {
      setActiveGroupId(null);
    }
  }, [grupos, activeGroupId]);

  const formatExcelValue = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (val instanceof Date) {
      const day = String(val.getUTCDate()).padStart(2, '0');
      const month = String(val.getUTCMonth() + 1).padStart(2, '0');
      const year = val.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    if (typeof val === 'number' && val > 30000 && val < 60000) {
      try {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) { return String(val); }
    }
    if (typeof val === 'number') return val.toLocaleString('pt-BR', { useGrouping: false });
    return String(val).trim();
  };

  const normalize = (k: string) => 
    k.toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/[^a-z0-9]/g, "")
     .trim();

  const findColumn = (availableKeys: string[], targets: string[]): string | null => {
    const normalizedTargets = targets.map(normalize);
    for (const key of availableKeys) {
      const nKey = normalize(key);
      if (normalizedTargets.includes(nKey)) return key;
    }
    for (const key of availableKeys) {
      const nKey = normalize(key);
      if (normalizedTargets.some(t => nKey.startsWith(t) || t.startsWith(nKey))) return key;
    }
    return null;
  };

  useEffect(() => {
    if (!activeGroupId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      setTasks(taskList.sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    }, (error) => {
      console.error("Erro real-time:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  // Filtro de Busca
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    const lowerSearch = searchTerm.toLowerCase();
    return tasks.filter(t => 
      t.omNumber.toLowerCase().includes(lowerSearch) || 
      t.description.toLowerCase().includes(lowerSearch) ||
      t.workCenter.toLowerCase().includes(lowerSearch)
    );
  }, [tasks, searchTerm]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'grupos'), { name: newGroupName, createdAt: Date.now() });
      setNewGroupName('');
      setIsAddingGroup(false);
      setActiveGroupId(docRef.id);
    } catch (error) { alert("Erro ao criar grupo."); }
  };

  // Funções de Processamento Real
  const executeClearTasks = async () => {
    setConfirmDelete(null);
    setIsProcessing(true);
    setProcessingText('Limpando lista de tarefas...');
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      alert("Erro ao limpar tarefas.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDeleteGroup = async (groupId: string) => {
    setConfirmDelete(null);
    setIsProcessing(true);
    setProcessingText('Excluindo grupo e tarefas...');
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      const batchFinal = writeBatch(db);
      batchFinal.delete(doc(db, 'grupos', groupId));
      await batchFinal.commit();
    } catch (error) { 
      alert("Erro ao excluir grupo."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleClearTasksRequest = () => {
    if (profile.role !== 'gerente') return;
    setConfirmDelete({
      type: 'tasks',
      title: 'Limpar Lista',
      message: `Você está prestes a apagar permanentemente todas as ${tasks.length} tarefas deste grupo. Esta ação não pode ser desfeita.`,
      onConfirm: executeClearTasks
    });
  };

  const handleDeleteGroupRequest = (groupId: string, name: string) => {
    if (profile.role !== 'gerente') return;
    setConfirmDelete({
      type: 'group',
      title: 'Excluir Grupo (Aba)',
      message: `CUIDADO! A exclusão da aba "${name}" apagará também todas as tarefas e históricos vinculados a ela para todos os usuários.`,
      onConfirm: () => executeDeleteGroup(groupId)
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId) return;

    setIsProcessing(true);
    setProcessingText('Processando Planilha...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array', cellDates: false });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });

        if (!jsonData || jsonData.length === 0) throw new Error("Planilha vazia.");

        const allKeys = Object.keys(jsonData[0]);
        const colOM = findColumn(allKeys, ['n om', 'om', 'ordem', 'numero ordem', 'tag']);
        const colDesc = findColumn(allKeys, ['descricao', 'texto breve', 'atividade', 'texto']);
        const colCT = findColumn(allKeys, ['centro de trabalho', 'centro trabalho', 'ct', 'cc', 'setor']);
        const colMin = findColumn(allKeys, ['data minima', 'inicio', 'data min', 'min']);
        const colMax = findColumn(allKeys, ['data maxima', 'fim', 'data max', 'max']);

        const chunkSize = 400;
        for (let i = 0; i < jsonData.length; i += chunkSize) {
          const chunk = jsonData.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          
          chunk.forEach((row: any) => {
            const newTaskRef = doc(collection(db, 'tarefas'));
            batch.set(newTaskRef, {
              groupId: activeGroupId,
              omNumber: colOM ? formatExcelValue(row[colOM]) : 'S/N',
              description: colDesc ? formatExcelValue(row[colDesc]) : 'Sem descrição',
              workCenter: colCT ? formatExcelValue(row[colCT]) : 'N/A',
              minDate: colMin ? formatExcelValue(row[colMin]) : '',
              maxDate: colMax ? formatExcelValue(row[colMax]) : '',
              status: 'Pendente',
              excelData: row,
              updatedAt: Date.now(),
              updatedBy: profile.uid,
              updatedByEmail: profile.email
            });
          });
          await batch.commit();
        }
        alert(`${jsonData.length} tarefas importadas com sucesso!`);
      } catch (err: any) { alert(`Erro: ${err.message}`); } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const activeGroup = grupos.find(g => g.id === activeGroupId);

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
            Controle de Manutenção
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest animate-pulse">LIVE</span>
          </h2>
          <p className="text-sm text-gray-500 font-medium italic">Sincronização instantânea com a equipe de campo.</p>
        </div>
        {profile.role === 'gerente' && (
          <button onClick={() => setIsAddingGroup(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-xl shadow-gray-200">
            <FolderPlus size={20} /> Criar Aba / Grupo
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
        {grupos.map((grupo) => (
          <button key={grupo.id} onClick={() => setActiveGroupId(grupo.id)} className={`px-8 py-5 text-sm font-black transition-all border-b-4 relative uppercase tracking-wider ${activeGroupId === grupo.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            {grupo.name}
          </button>
        ))}
      </div>

      {isAddingGroup && (
        <div className="bg-white p-6 rounded-3xl shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200">
          <form onSubmit={handleAddGroup} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Nome do Grupo</label>
              <input autoFocus type="text" placeholder="Ex: PARADA SETOR A" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-black text-gray-800" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="submit" className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 flex items-center justify-center gap-2 uppercase"><Check size={20} /> Salvar</button>
              <button type="button" onClick={() => setIsAddingGroup(false)} className="flex-1 md:flex-none px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {activeGroup ? (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 ml-2 flex-1">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white p-3 rounded-2xl"><List size={20} /></div>
                <div>
                  <span className="text-xs text-gray-400 font-black uppercase block tracking-widest">Grupo Ativo</span>
                  <span className="text-xl font-black text-gray-900 uppercase">{activeGroup.name}</span>
                </div>
              </div>

              {/* Campo de Busca */}
              <div className="relative w-full sm:max-w-xs sm:ml-6 mt-4 sm:mt-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar OM ou Descrição..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none font-bold text-sm text-gray-800 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profile.role === 'gerente' && (
                <>
                  <label className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl cursor-pointer transition-all font-black shadow-lg shadow-emerald-100 uppercase text-xs">
                    <Upload size={18} /> Importar
                    <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
                  </label>
                  <button 
                    onClick={handleClearTasksRequest}
                    disabled={tasks.length === 0}
                    className="flex items-center gap-2 px-6 py-4 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-2xl transition-all font-black uppercase text-xs disabled:opacity-50"
                  >
                    <Eraser size={18} /> Limpar Lista
                  </button>
                  <button 
                    onClick={() => handleDeleteGroupRequest(activeGroup.id, activeGroup.name)} 
                    className="p-4 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all border border-rose-100"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
              <p className="text-gray-400 font-black uppercase text-xs">Sincronizando...</p>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº OM</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Centro de Trabalho</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Data Mínima</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Data Máxima</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTasks.map(task => (
                      <TaskCard key={task.id} task={task} onOpenDetails={() => setSelectedTask(task)} profile={profile} variant="list" />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center max-w-3xl mx-auto px-10">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 text-gray-300 mb-6" />
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Nenhum resultado</h3>
                  <p className="text-gray-500 mt-3 mb-4 font-medium italic">Não encontramos nada para "{searchTerm}" neste grupo.</p>
                  <button onClick={() => setSearchTerm('')} className="text-blue-600 font-black uppercase text-xs hover:underline tracking-widest">Limpar busca</button>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-6" />
                  <h3 className="text-2xl font-black text-gray-900 uppercase">Aba Vazia</h3>
                  <p className="text-gray-500 mt-3 mb-10 font-medium">Importe sua planilha de manutenção para começar.</p>
                  {profile.role === 'gerente' && (
                    <label className="flex items-center gap-4 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl cursor-pointer transition-all font-black text-lg shadow-2xl">
                      <Upload size={24} /> IMPORTAR EXCEL AGORA
                      <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
                    </label>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <Settings2 className="mx-auto w-16 h-16 text-gray-200 mb-6" />
          <h3 className="text-xl font-black text-gray-400 uppercase">Nenhuma aba selecionada</h3>
        </div>
      )}

      {/* Modal de Confirmação Customizado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-rose-600 p-8 flex items-center gap-4 text-white">
              <div className="p-3 bg-white/20 rounded-2xl"><AlertOctagon size={32} /></div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Atenção Gerente</h3>
                <p className="text-xs font-bold uppercase opacity-80 tracking-widest">{confirmDelete.title}</p>
              </div>
            </div>
            <div className="p-8">
              <p className="text-gray-700 font-bold text-lg leading-relaxed">{confirmDelete.message}</p>
              <div className="mt-10 flex flex-col gap-3">
                <button 
                  onClick={confirmDelete.onConfirm}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} /> Confirmar e Excluir Agora
                </button>
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="w-full py-4 bg-gray-50 text-gray-400 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all"
                >
                  Cancelar Operação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h3 className="text-2xl font-black text-gray-900 uppercase">{processingText}</h3>
            <p className="text-gray-500 mt-4 text-sm font-medium">Não feche esta página até concluir.</p>
          </div>
        </div>
      )}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} profile={profile} />}
    </div>
  );
};

export default Dashboard;
