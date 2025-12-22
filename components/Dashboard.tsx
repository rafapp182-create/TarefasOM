
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Grupo, Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { Trash2, Upload, Loader2, FileSpreadsheet, Settings2, FolderPlus, Search, Filter, Eraser, AlertOctagon } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'Todos'>('Todos');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'group' | 'tasks'; title: string; message: string; onConfirm: () => void; } | null>(null);

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
      return `${String(val.getUTCDate()).padStart(2, '0')}/${String(val.getUTCMonth() + 1).padStart(2, '0')}/${val.getUTCFullYear()}`;
    }
    return String(val).trim();
  };

  const findColumn = (availableKeys: string[], targets: string[]): string | null => {
    const normalize = (k: string) => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    const normalizedTargets = targets.map(normalize);
    for (const key of availableKeys) {
      if (normalizedTargets.includes(normalize(key))) return key;
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
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !searchTerm.trim() || 
        t.omNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.workCenter.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'Todos' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tasks, searchTerm, filterStatus]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'grupos'), { name: newGroupName, createdAt: Date.now() });
      setNewGroupName('');
      setIsAddingGroup(false);
      setActiveGroupId(docRef.id);
    } catch (error) { console.error(error); }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId) return;
    setIsProcessing(true);
    setProcessingText('Sincronizando Planilha...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (!jsonData.length) throw new Error("Planilha vazia.");

        const allKeys = Object.keys(jsonData[0]);
        const colOM = findColumn(allKeys, ['om', 'ordem', 'tag', 'n om']);
        const colDesc = findColumn(allKeys, ['descricao', 'atividade', 'texto']);
        const colCT = findColumn(allKeys, ['centro trabalho', 'ct', 'setor']);
        const colMin = findColumn(allKeys, ['data minima', 'inicio']);
        const colMax = findColumn(allKeys, ['data maxima', 'fim']);

        const batch = writeBatch(db);
        jsonData.forEach((row: any) => {
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
      } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const activeGroup = grupos.find(g => g.id === activeGroupId);

  return (
    <div className="p-3 md:p-8 max-w-full mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2 uppercase tracking-tighter">
            Controle Operacional
            <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-black uppercase tracking-widest">LIVE</span>
          </h2>
          <p className="text-xs md:text-sm text-black dark:text-zinc-400 font-medium italic">Gestão de tarefas em tempo real.</p>
        </div>
        {profile.role === 'gerente' && (
          <button onClick={() => setIsAddingGroup(true)} className="flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-zinc-800 text-white rounded-xl font-bold transition-all text-sm w-full md:w-auto">
            <FolderPlus size={18} /> Criar Nova Aba
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-gray-200 dark:border-zinc-800 pb-1 no-scrollbar">
        {grupos.map((grupo) => (
          <button 
            key={grupo.id} 
            onClick={() => setActiveGroupId(grupo.id)} 
            className={`px-5 py-3 md:px-8 md:py-5 text-xs md:text-sm font-black transition-all border-b-4 whitespace-nowrap uppercase tracking-wider ${activeGroupId === grupo.id ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-black dark:text-zinc-400'}`}
          >
            {grupo.name}
          </button>
        ))}
      </div>

      {isAddingGroup && (
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl shadow-xl border border-blue-50 dark:border-zinc-800 animate-in slide-in-from-top-4">
          <form onSubmit={handleAddGroup} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-black dark:text-zinc-400 uppercase mb-1 ml-1">Nome da Aba</label>
              <input autoFocus type="text" placeholder="Ex: PARADA SETOR 01" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 p-3 md:p-4 rounded-xl focus:border-blue-500 outline-none font-bold text-black dark:text-white" />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white font-black rounded-xl uppercase text-xs">Salvar</button>
              <button type="button" onClick={() => setIsAddingGroup(false)} className="px-4 py-3 bg-gray-100 dark:bg-zinc-700 text-black dark:text-white font-bold rounded-xl text-xs">Sair</button>
            </div>
          </form>
        </div>
      )}

      {activeGroup ? (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col xl:flex-row gap-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar OM, Descrição ou CT..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl focus:border-blue-600 outline-none font-bold text-sm text-black dark:text-white transition-all"
                />
              </div>
              <div className="relative min-w-[160px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl focus:border-blue-600 outline-none font-bold text-sm text-black dark:text-white appearance-none cursor-pointer"
                >
                  <option value="Todos">Todos Status</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Executada">Executadas</option>
                  <option value="Não executada">Não executadas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {profile.role === 'gerente' && (
                <>
                  <label className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl cursor-pointer font-black uppercase text-[10px] whitespace-nowrap">
                    <Upload size={16} /> Importar
                    <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
                  </label>
                  <button onClick={() => setConfirmDelete({ type: 'tasks', title: 'Limpar Lista', message: 'Apagar permanentemente todas as tarefas deste grupo?', onConfirm: executeClearTasks })} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                    <Eraser size={18} />
                  </button>
                  <button onClick={() => setConfirmDelete({ type: 'group', title: 'Excluir Aba', message: `Apagar a aba "${activeGroup.name}" e todas as suas tarefas?`, onConfirm: () => executeDeleteGroup(activeGroup.id) })} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 w-10 h-10 mb-2" />
              <p className="text-[10px] font-black uppercase text-black dark:text-zinc-400">Carregando dados...</p>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-4">
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Nº OM</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">CT</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center">Datas</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                    {filteredTasks.map(task => (
                      <TaskCard key={task.id} task={task} onOpenDetails={() => setSelectedTask(task)} profile={profile} variant="list" />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden grid grid-cols-1 gap-3">
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} onOpenDetails={() => setSelectedTask(task)} profile={profile} variant="card" />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
              <FileSpreadsheet className="mx-auto text-blue-300 dark:text-zinc-700 w-12 h-12 mb-4" />
              <p className="text-sm font-black text-black dark:text-white uppercase">Nenhuma tarefa encontrada</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
          <Settings2 className="mx-auto w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-black dark:text-zinc-400 uppercase tracking-widest">Selecione uma aba para começar</h3>
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} profile={profile} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertOctagon size={32} />
            </div>
            <h3 className="text-lg font-black text-black dark:text-white uppercase mb-2">{confirmDelete.title}</h3>
            <p className="text-sm text-black dark:text-zinc-400 mb-6 font-medium leading-tight">{confirmDelete.message}</p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDelete.onConfirm} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-xs">Confirmar</button>
              <button onClick={() => setConfirmDelete(null)} className="w-full py-3 bg-gray-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl font-bold text-xs">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-black text-white uppercase">{processingText}</h3>
          </div>
        </div>
      )}
    </div>
  );

  async function executeClearTasks() {
    setConfirmDelete(null); setIsProcessing(true);
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  }

  async function executeDeleteGroup(groupId: string) {
    setConfirmDelete(null); setIsProcessing(true);
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'grupos', groupId));
      await batch.commit();
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  }
};

export default Dashboard;
