
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Grupo, Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { Trash2, Upload, Loader2, FileSpreadsheet, Settings2, FolderPlus, Search, Filter, Eraser, AlertOctagon, XCircle, FileText, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import TaskModal from './TaskModal';
import ImportMappingModal from './ImportMappingModal';

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

  // Estado para seleção múltipla
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const [showMapping, setShowMapping] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelDataPending, setExcelDataPending] = useState<any[]>([]);

  useEffect(() => {
    if (grupos.length > 0 && activeGroupId && !grupos.find(g => g.id === activeGroupId)) {
      setActiveGroupId(grupos[0].id);
    } else if (grupos.length === 0) {
      setActiveGroupId(null);
    }
  }, [grupos, activeGroupId]);

  const getDateTimestamp = (dateStr: string): number => {
    if (!dateStr || typeof dateStr !== 'string') return Infinity;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return Infinity;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  };

  const formatExcelValue = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const day = String(val.getDate()).padStart(2, '0');
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const year = val.getFullYear();
      return `${day}/${month}/${year}`;
    }
    if (typeof val === 'number' && val > 40000 && val < 60000) {
      const date = XLSX.SSF.parse_date_code(val);
      return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`;
    }
    return String(val).trim();
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
      setTasks(taskList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  const filteredTasks = useMemo(() => {
    const result = tasks.filter(t => {
      const matchSearch = !searchTerm.trim() || 
        t.omNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.workCenter.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'Todos' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });

    return result.sort((a, b) => {
      const timeA = getDateTimestamp(a.minDate);
      const timeB = getDateTimestamp(b.minDate);
      if (timeA === timeB) return b.updatedAt - a.updatedAt;
      return timeA - timeB;
    });
  }, [tasks, searchTerm, filterStatus]);

  // Funções de Seleção
  const toggleTaskSelection = (id: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTaskIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const exportSelectedToPDF = () => {
    const tasksToExport = tasks.filter(t => selectedTaskIds.has(t.id));
    if (tasksToExport.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const activeGroupName = grupos.find(g => g.id === activeGroupId)?.name || 'Geral';

    doc.setFontSize(18);
    doc.text(`Relatório de Tarefas Selecionadas - ${activeGroupName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()} | Itens: ${tasksToExport.length}`, 14, 28);

    const tableRows = tasksToExport.map(t => [
      t.omNumber,
      t.description,
      t.workCenter,
      t.status,
      t.minDate || '-',
      t.maxDate || '-',
      t.shift || '-',
      t.reason || '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['OM', 'Descrição', 'CT', 'Status', 'Início', 'Fim', 'Turno', 'Motivo']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 1: { cellWidth: 50 }, 7: { cellWidth: 35 } }
    });

    doc.save(`OmPro_Selecao_${activeGroupName}_${new Date().getTime()}.pdf`);
    setSelectedTaskIds(new Set());
  };

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

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId) return;
    setIsProcessing(true);
    setProcessingText('Analisando Planilha...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        const headerIndex = rows.findIndex(row => row.filter(cell => String(cell).trim() !== '').length >= 2);
        const headers = rows[headerIndex].filter(h => h && !String(h).startsWith('__EMPTY'));
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex, defval: '', blankrows: false });
        setExcelHeaders(headers);
        setExcelDataPending(jsonData);
        setShowMapping(true);
      } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const processMappingAndImport = async (mapping: Record<string, string>) => {
    setShowMapping(false);
    setIsProcessing(true);
    setProcessingText('Sincronizando Banco...');
    try {
      const batch = writeBatch(db);
      excelDataPending.forEach((row: any) => {
        const newTaskRef = doc(collection(db, 'tarefas'));
        batch.set(newTaskRef, {
          groupId: activeGroupId,
          omNumber: mapping.omNumber ? formatExcelValue(row[mapping.omNumber]) : 'S/N',
          description: mapping.description ? formatExcelValue(row[mapping.description]) : 'Sem descrição',
          workCenter: mapping.workCenter ? formatExcelValue(row[mapping.workCenter]) : 'N/A',
          minDate: mapping.minDate ? formatExcelValue(row[mapping.minDate]) : '',
          maxDate: mapping.maxDate ? formatExcelValue(row[mapping.maxDate]) : '',
          status: 'Pendente',
          excelData: row,
          updatedAt: Date.now(),
          updatedBy: profile.uid,
          updatedByEmail: profile.email,
          history: []
        });
      });
      await batch.commit();
    } catch (err: any) { alert(err.message); } finally { setIsProcessing(false); }
  };

  const activeGroup = grupos.find(g => g.id === activeGroupId);

  return (
    <div className="p-3 md:p-8 max-w-full mx-auto space-y-4 md:space-y-6 pb-24">
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
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-4">
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
                    <label className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl cursor-pointer font-black uppercase text-[10px] whitespace-nowrap hover:bg-emerald-700 transition-colors shadow-lg">
                      <Upload size={16} /> Importar Colunas
                      <input type="file" accept=".xlsx, .xls" onChange={handleExcelFileSelect} className="hidden" />
                    </label>
                    <button onClick={() => setConfirmDelete({ type: 'tasks', title: 'Limpar Lista', message: 'Apagar tudo deste grupo?', onConfirm: async () => {
                      setConfirmDelete(null); setIsProcessing(true); setProcessingText('Limpando...');
                      const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
                      const snapshot = await getDocs(q);
                      const batch = writeBatch(db);
                      snapshot.docs.forEach(d => batch.delete(d.ref));
                      await batch.commit();
                      setIsProcessing(false);
                    }})} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                      <Eraser size={18} />
                    </button>
                  </>
                )}
              </div>
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
                      <th className="px-6 py-4 w-10">
                        <button onClick={toggleSelectAll} className="text-blue-600">
                          {selectedTaskIds.size === filteredTasks.length ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Nº OM</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">CT</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center">Início (Cresc.)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                    {filteredTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onOpenDetails={() => setSelectedTask(task)} 
                        profile={profile} 
                        variant="list" 
                        isSelected={selectedTaskIds.has(task.id)}
                        onToggleSelection={() => toggleTaskSelection(task.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden grid grid-cols-1 gap-3">
                {filteredTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onOpenDetails={() => setSelectedTask(task)} 
                    profile={profile} 
                    variant="card" 
                    isSelected={selectedTaskIds.has(task.id)}
                    onToggleSelection={() => toggleTaskSelection(task.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
              <FileSpreadsheet className="mx-auto text-blue-300 dark:text-zinc-700 w-12 h-12 mb-4" />
              <p className="text-sm font-black text-black dark:text-white uppercase">Nenhuma tarefa corresponde aos filtros</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
          <Settings2 className="mx-auto w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-black dark:text-zinc-400 uppercase tracking-widest">Selecione uma aba para começar</h3>
        </div>
      )}

      {/* Barra de Ações Flutuante */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-blue-100 dark:border-zinc-700 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">{selectedTaskIds.size}</div>
            <div className="hidden sm:block">
              <p className="text-xs font-black text-black dark:text-white uppercase leading-none">Itens Selecionados</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Pronto para exportar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedTaskIds(new Set())}
              className="px-4 py-2.5 text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={exportSelectedToPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95"
            >
              <FileText size={16} /> Gerar PDF
            </button>
          </div>
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} profile={profile} />}
      {showMapping && <ImportMappingModal headers={excelHeaders} onCancel={() => { setShowMapping(false); setExcelDataPending([]); }} onConfirm={processMappingAndImport} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertOctagon size={32} /></div>
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-6 text-center">
          <div>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-black text-white uppercase">{processingText}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
