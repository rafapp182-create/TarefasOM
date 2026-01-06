
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Grupo, Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { Trash2, Upload, Loader2, FileSpreadsheet, Settings2, FolderPlus, Search, Filter, Eraser, AlertOctagon, XCircle, FileText, CheckSquare, Square, Calendar, Briefcase, ChevronDown, Check, X, PlusCircle, AlertTriangle, FileDown } from 'lucide-react';
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
  
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<Set<string>>(new Set());
  const [filterWorkCenter, setFilterWorkCenter] = useState<Set<string>>(new Set());
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ 
    type: 'group' | 'tasks' | 'selected'; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
  } | null>(null);

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
    setSelectedTaskIds(new Set());
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
    }, (error) => {
      console.error("Erro no Listener:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  const uniqueStartDates = useMemo(() => {
    const dates = new Set<string>();
    tasks.forEach(t => t.minDate && dates.add(t.minDate.trim()));
    return Array.from(dates).sort((a, b) => getDateTimestamp(a) - getDateTimestamp(b));
  }, [tasks]);

  const uniqueWorkCenters = useMemo(() => {
    const centers = new Set<string>();
    tasks.forEach(t => t.workCenter && centers.add(t.workCenter.trim()));
    return Array.from(centers).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const result = tasks.filter(t => {
      const matchSearch = !term || 
        t.omNumber.toLowerCase().includes(term) || 
        t.description.toLowerCase().includes(term) ||
        t.workCenter.toLowerCase().includes(term) ||
        (t.circuit && t.circuit.toLowerCase().includes(term));
      
      const matchStatus = filterStatus.size === 0 || filterStatus.has(t.status);
      const matchDate = filterDate.size === 0 || filterDate.has(t.minDate);
      const matchWorkCenter = filterWorkCenter.size === 0 || filterWorkCenter.has(t.workCenter);
      
      return matchSearch && matchStatus && matchDate && matchWorkCenter;
    });

    return result.sort((a, b) => {
      const timeA = getDateTimestamp(a.minDate);
      const timeB = getDateTimestamp(b.minDate);
      if (timeA === timeB) return b.updatedAt - a.updatedAt;
      return timeA - timeB;
    });
  }, [tasks, searchTerm, filterStatus, filterDate, filterWorkCenter]);

  const toggleFilterValue = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsProcessing(true);
    setProcessingText('Criando Aba...');
    try {
      const docRef = await addDoc(collection(db, 'grupos'), {
        name: newGroupName.trim(),
        createdAt: Date.now()
      });
      setNewGroupName('');
      setIsAddingGroup(false);
      setActiveGroupId(docRef.id);
    } catch (err) {
      alert("Erro ao criar aba.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    setIsProcessing(true);
    setProcessingText('Removendo Aba e Dados...');
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'grupos', activeGroupId));
      await batch.commit();
      setConfirmDelete(null);
    } catch (err) { alert("Erro ao excluir."); } finally { setIsProcessing(false); }
  };

  const handleClearTasks = async () => {
    if (!activeGroupId) return;
    setIsProcessing(true);
    setProcessingText('Limpando Lista...');
    try {
      const q = query(collection(db, 'tarefas'), where('groupId', '==', activeGroupId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setConfirmDelete(null);
      setSelectedTaskIds(new Set());
    } catch (err) { alert("Erro ao limpar."); } finally { setIsProcessing(false); }
  };

  const handleDeleteSelectedTasks = async () => {
    if (selectedTaskIds.size === 0) return;
    setIsProcessing(true);
    setProcessingText('Excluindo Selecionados...');
    try {
      const batch = writeBatch(db);
      selectedTaskIds.forEach(id => {
        batch.delete(doc(db, 'tarefas', id));
      });
      await batch.commit();
      setSelectedTaskIds(new Set());
      setConfirmDelete(null);
    } catch (err) { alert("Erro ao excluir tarefas."); } finally { setIsProcessing(false); }
  };

  const exportSelectedToPDF = () => {
    if (selectedTaskIds.size === 0) return;
    
    setIsProcessing(true);
    setProcessingText('Gerando Relatório...');

    try {
      const tasksToExport = tasks.filter(t => selectedTaskIds.has(t.id))
        .sort((a, b) => getDateTimestamp(a.minDate) - getDateTimestamp(b.minDate));

      // Colunas finais conforme solicitado (Removido Início, Fim e Status)
      const requiredColumns = [
        "CIRCUITO",
        "LOCAL DE INSTALAÇÃO",
        "TAG",
        "Nº OM",
        "DESCRIÇÃO DA ATIVIDADE",
        "CENTRO DE TRAB.",
        "QTD",
        "DUR",
        "DUR. TOTAL"
      ];

      const body = tasksToExport.map(t => {
        return requiredColumns.map(col => {
          // Tenta pegar do excelData usando a chave exata
          const val = t.excelData ? (t.excelData[col] || t.excelData[col.toLowerCase()] || '') : '';
          return val !== undefined && val !== null ? String(val).toUpperCase() : '-';
        });
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const groupName = grupos.find(g => g.id === activeGroupId)?.name || 'OmPro';
      
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(`RELATÓRIO TÉCNICO OPERACIONAL - ${groupName.toUpperCase()}`, 10, 15);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleString()} | TOTAL DE ITENS: ${tasksToExport.length}`, 10, 21);

      // Configuração de Estilo e Escala com colunas reduzidas
      autoTable(doc, {
        startY: 25,
        head: [requiredColumns],
        body: body,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 41, 59], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 8, // Fonte maior pois temos menos colunas
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: { 
          fontSize: 7.5, 
          cellPadding: 2,
          textColor: [40, 40, 40],
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          4: { cellWidth: 80 }, // Descrição com mais espaço agora
          3: { halign: 'center' }, // Nº OM centralizado
          6: { halign: 'center' }, // QTD centralizado
          7: { halign: 'center' }, // DUR centralizado
          8: { halign: 'center' }  // DUR TOTAL centralizado
        },
        styles: { 
          overflow: 'linebreak',
          valign: 'middle',
          font: 'helvetica'
        },
        margin: { top: 25, left: 10, right: 10, bottom: 15 },
        didDrawPage: (data) => {
          const str = "Página " + doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 8);
          doc.text("OMPRO LIVE - RELATÓRIO OPERACIONAL", pageSize.width - 60, pageHeight - 8);
        }
      });

      const fileName = `RELATORIO_${groupName.replace(/\s+/g, '_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar PDF: " + err.message);
    } finally {
      setIsProcessing(false);
    }
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
        let headerIndex = rows.findIndex(row => row.filter(cell => String(cell).trim() !== '').length >= 3);
        if (headerIndex === -1) headerIndex = 0;
        const headers = rows[headerIndex].map(h => String(h).trim()).filter(h => h !== '');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex, defval: '', blankrows: false });
        setExcelHeaders(headers);
        setExcelDataPending(jsonData);
        setShowMapping(true);
      } catch (err: any) { alert("Erro ao ler Excel: " + err.message); } finally { setIsProcessing(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const processMappingAndImport = async (mapping: Record<string, string>) => {
    setShowMapping(false);
    setIsProcessing(true);
    setProcessingText('Sincronizando Banco...');
    try {
      const data = excelDataPending;
      const CHUNK_SIZE = 400; 
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((row: any) => {
          const newTaskRef = doc(collection(db, 'tarefas'));
          batch.set(newTaskRef, {
            groupId: activeGroupId,
            omNumber: mapping.omNumber ? formatExcelValue(row[mapping.omNumber]) : 'S/N',
            description: mapping.description ? formatExcelValue(row[mapping.description]) : 'Sem descrição',
            workCenter: mapping.workCenter ? formatExcelValue(row[mapping.workCenter]) : 'N/A',
            circuit: mapping.circuit ? formatExcelValue(row[mapping.circuit]) : '',
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
      }
      alert("Importação concluída com sucesso!");
    } catch (err: any) { alert("Erro ao importar: " + err.message); } finally { setIsProcessing(false); }
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
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {profile.role !== 'executor' && (
            <>
              <button 
                onClick={() => setIsAddingGroup(true)} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
              >
                <FolderPlus size={18} /> Criar Aba
              </button>
              
              {activeGroupId && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setConfirmDelete({
                      type: 'tasks',
                      title: 'Limpar Lista',
                      message: 'Isso apagará todas as tarefas desta aba permanentemente.',
                      onConfirm: handleClearTasks
                    })}
                    className="flex-1 sm:flex-none p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors border border-rose-100 dark:border-rose-900/30"
                    title="Limpar Lista"
                  >
                    <Eraser size={20} />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({
                      type: 'group',
                      title: 'Excluir Aba',
                      message: 'Isso apagará a aba e todas as tarefas vinculadas a ela.',
                      onConfirm: handleDeleteGroup
                    })}
                    className="flex-1 sm:flex-none p-4 bg-rose-600 text-white rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/20"
                    title="Excluir Aba"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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

      {activeGroup && (
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm relative z-40">
            <div className="flex flex-col xl:flex-row gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Busca Geral..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl focus:border-blue-600 outline-none font-bold text-sm text-black dark:text-white transition-all"
                  />
                </div>

                <MultiSelectDropdown 
                  label="Datas" 
                  icon={<Calendar size={16} />} 
                  options={uniqueStartDates} 
                  selected={filterDate} 
                  onToggle={(val) => toggleFilterValue(filterDate, setFilterDate, val)} 
                  isOpen={openFilter === 'date'}
                  onOpen={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
                />

                <MultiSelectDropdown 
                  label="Setores (CT)" 
                  icon={<Briefcase size={16} />} 
                  options={uniqueWorkCenters} 
                  selected={filterWorkCenter} 
                  onToggle={(val) => toggleFilterValue(filterWorkCenter, setFilterWorkCenter, val)}
                  isOpen={openFilter === 'wc'}
                  onOpen={() => setOpenFilter(openFilter === 'wc' ? null : 'wc')}
                />

                <MultiSelectDropdown 
                  label="Status" 
                  icon={<Filter size={16} />} 
                  options={['Pendente', 'Em andamento', 'Executada', 'Não executada']} 
                  selected={filterStatus} 
                  onToggle={(val) => toggleFilterValue(filterStatus, setFilterStatus, val)}
                  isOpen={openFilter === 'status'}
                  onOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                />
              </div>

              <div className="flex items-center gap-2">
                {profile.role !== 'executor' && (
                  <label className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl cursor-pointer font-black uppercase text-[10px] whitespace-nowrap hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/10 w-full md:w-auto justify-center">
                    <Upload size={16} /> Importar Planilha
                    <input type="file" onClick={(e) => (e.currentTarget.value = '')} accept=".xlsx, .xls" onChange={handleExcelFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 w-10 h-10 mb-2" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 w-10">
                        <button onClick={() => {
                          const allVisibleIds = filteredTasks.map(t => t.id);
                          const allSelected = allVisibleIds.every(id => selectedTaskIds.has(id));
                          if (allSelected) {
                            const next = new Set(selectedTaskIds);
                            allVisibleIds.forEach(id => next.delete(id));
                            setSelectedTaskIds(next);
                          } else {
                            setSelectedTaskIds(new Set([...selectedTaskIds, ...allVisibleIds]));
                          }
                        }} className="text-blue-600">
                          {filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id)) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Nº OM</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">Descrição</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest">CT</th>
                      <th className="px-4 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center whitespace-nowrap">DUR. TOTAL</th>
                      <th className="px-4 py-4 text-[10px] font-black text-black dark:text-zinc-500 uppercase tracking-widest text-center">Início</th>
                      <th className="px-4 py-4 text-[10px] font-black text-black dark:text-zinc-500 uppercase tracking-widest text-center">Término</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black dark:text-zinc-400 uppercase tracking-widest text-center">Status</th>
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
                        onToggleSelection={() => {
                          const next = new Set(selectedTaskIds);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          setSelectedTaskIds(next);
                        }}
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
                    onToggleSelection={() => {
                      const next = new Set(selectedTaskIds);
                      if (next.has(task.id)) next.delete(task.id);
                      else next.add(task.id);
                      setSelectedTaskIds(next);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-full px-6 py-4 z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
              {selectedTaskIds.size}
            </span>
            <span className="text-xs font-black text-black dark:text-white uppercase tracking-tighter">Itens Selecionados</span>
          </div>
          
          <div className="h-8 w-px bg-gray-100 dark:bg-zinc-800" />
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportSelectedToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
            >
              <FileDown size={16} /> Gerar PDF Técnico
            </button>
            
            {profile.role !== 'executor' && (
              <button 
                onClick={() => setConfirmDelete({
                  type: 'selected',
                  title: 'Excluir Selecionados',
                  message: `Deseja excluir permanentemente as ${selectedTaskIds.size} tarefas selecionadas?`,
                  onConfirm: handleDeleteSelectedTasks
                })}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={16} /> Excluir
              </button>
            )}
            
            <button 
              onClick={() => setSelectedTaskIds(new Set())}
              className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{confirmDelete.title}</h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">{confirmDelete.message}</p>
              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete.onConfirm}
                  className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/20 transition-all active:scale-95"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
            <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-black dark:bg-zinc-700 rounded-2xl text-white">
                  <FolderPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter leading-tight">Nova Aba</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Identifique o grupo de tarefas</p>
                </div>
              </div>
              <button onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X size={24} className="text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddGroup} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Nome da Aba</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Parada Preventiva"
                  className="w-full px-6 py-5 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600 font-bold text-black dark:text-white transition-all shadow-inner"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}
                  className="flex-1 py-5 bg-gray-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newGroupName.trim() || isProcessing}
                  className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><PlusCircle size={18} /> Criar Aba Agora</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} profile={profile} />}
      {showMapping && <ImportMappingModal headers={excelHeaders} onCancel={() => setShowMapping(false)} onConfirm={processMappingAndImport} />}
      
      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-6 text-center">
          <div>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{processingText}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

const MultiSelectDropdown: React.FC<{ 
  label: string; 
  icon: React.ReactNode; 
  options: string[]; 
  selected: Set<string>; 
  onToggle: (v: string) => void; 
  isOpen: boolean; 
  onOpen: () => void;
}> = ({ label, icon, options, selected, onToggle, isOpen, onOpen }) => (
  <div className="relative">
    <button 
      onClick={onOpen}
      className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 rounded-xl focus:border-blue-600 outline-none font-bold text-sm transition-all ${selected.size > 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}
    >
      <div className="flex items-center gap-2 truncate">
        {icon}
        <span>{selected.size > 0 ? `${label} (${selected.size})` : label}</span>
      </div>
      <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    
    {isOpen && (
      <>
        <div className="fixed inset-0 z-10" onClick={onOpen} />
        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl z-50 p-2 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
          <div className="space-y-1">
            {options.map(opt => (
              <label 
                key={opt} 
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selected.has(opt) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={selected.has(opt)} 
                  onChange={() => onToggle(opt)} 
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected.has(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-zinc-700'}`}>
                  {selected.has(opt) && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs font-bold uppercase truncate">{opt || '(Vazio)'}</span>
              </label>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);

export default Dashboard;
