
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo } from '../types';
import { FileDown, Search, Loader2, FileText, Filter, ChevronDown, Check, Eraser, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC<{ grupos: Grupo[] }> = ({ grupos }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterGroups, setFilterGroups] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterSearch, setFilterSearch] = useState('');
  
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tarefas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchGroup = filterGroups.size === 0 || filterGroups.has(t.groupId);
      const matchStatus = filterStatuses.size === 0 || filterStatuses.has(t.status);
      const matchSearch = !filterSearch || 
        t.description.toLowerCase().includes(filterSearch.toLowerCase()) || 
        t.omNumber.toLowerCase().includes(filterSearch.toLowerCase());
      
      return matchGroup && matchStatus && matchSearch;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tasks, filterGroups, filterStatuses, filterSearch]);

  const toggleFilter = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const clearFilters = () => {
    setFilterGroups(new Set());
    setFilterStatuses(new Set());
    setFilterSearch('');
  };

  const exportToExcel = () => {
    const dataToExport = filteredTasks.map(t => ({
      'Nº OM': t.omNumber,
      'Descrição': t.description,
      'Aba': grupos.find(g => g.id === t.groupId)?.name || '-',
      'Status': t.status,
      'Turno': t.shift || 'N/A',
      'Atualizado por': t.updatedByEmail
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `Relatorio_OmPro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    if (filteredTasks.length === 0) return;

    try {
      // Colunas mostradas na tela conforme solicitado
      const requiredColumns = [
        "Nº OM",
        "DESCRIÇÃO",
        "ABA",
        "STATUS",
        "TURNO"
      ];

      const body = filteredTasks.map(t => {
        return [
          t.omNumber.toUpperCase(),
          t.description.toUpperCase(),
          (grupos.find(g => g.id === t.groupId)?.name || '-').toUpperCase(),
          t.status.toUpperCase(),
          (t.shift || '-').toUpperCase()
        ];
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(`RELATÓRIO CONSOLIDADO DE TAREFAS`, 10, 15);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`DATA: ${new Date().toLocaleString()} | TOTAL: ${filteredTasks.length} ITENS`, 10, 21);

      autoTable(doc, {
        startY: 25,
        head: [requiredColumns],
        body: body,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 41, 59], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 9,
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: { 
          fontSize: 8, 
          cellPadding: 3,
          textColor: [40, 40, 40],
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' }
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
          doc.text("OMPRO LIVE - GESTÃO OPERACIONAL", pageSize.width - 60, pageHeight - 8);
        }
      });

      doc.save(`RELATORIO_TELA_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      alert("Erro ao gerar PDF: " + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Relatórios Consolidadores</h2>
          <p className="text-zinc-500 text-sm font-medium italic">Visualize e exporte dados de todas as abas.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={clearFilters} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors" title="Limpar Filtros">
            <Eraser size={20} />
          </button>
          <button 
            onClick={exportToPDF} 
            disabled={filteredTasks.length === 0} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50"
          >
            <FileText size={18} /> Gerar PDF (Tela)
          </button>
          <button 
            onClick={exportToExcel} 
            disabled={filteredTasks.length === 0} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 relative z-40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl outline-none text-sm font-bold text-black dark:text-white focus:border-blue-600 transition-all"
            placeholder="Nº OM ou Descrição..."
          />
        </div>

        <MultiSelectDropdown 
          label="Abas" 
          options={grupos.map(g => ({ value: g.id, label: g.name }))} 
          selected={filterGroups} 
          onToggle={v => toggleFilter(filterGroups, setFilterGroups, v)}
          isOpen={openFilter === 'group'}
          onOpen={() => setOpenFilter(openFilter === 'group' ? null : 'group')}
        />

        <MultiSelectDropdown 
          label="Status" 
          options={['Pendente', 'Em andamento', 'Executada', 'Não executada'].map(s => ({ value: s, label: s }))} 
          selected={filterStatuses} 
          onToggle={v => toggleFilter(filterStatuses, setFilterStatuses, v)}
          isOpen={openFilter === 'status'}
          onOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-5">Nº OM</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5 text-center">Aba</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Turno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Carregando dados...</p>
                  </td>
                </tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map(t => (
                  <tr key={t.id} className="text-sm hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-5 font-mono font-black text-black dark:text-white">{t.omNumber}</td>
                    <td className="px-6 py-5 text-zinc-700 dark:text-zinc-300 font-bold max-w-xs truncate">{t.description}</td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                         {grupos.find(g => g.id === t.groupId)?.name || '-'}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter inline-block ${
                        t.status === 'Executada' ? 'bg-emerald-500 text-white' : 
                        t.status === 'Em andamento' ? 'bg-blue-500 text-white' :
                        t.status === 'Não executada' ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-zinc-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-black text-black dark:text-white">{t.shift || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Nenhuma tarefa encontrada com esses filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MultiSelectDropdown: React.FC<{ 
  label: string; 
  options: { value: string; label: string }[]; 
  selected: Set<string>; 
  onToggle: (v: string) => void; 
  isOpen: boolean; 
  onOpen: () => void;
}> = ({ label, options, selected, onToggle, isOpen, onOpen }) => (
  <div className="relative">
    <button onClick={onOpen} className={`w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 rounded-xl text-sm font-bold transition-all focus:border-blue-600 ${selected.size > 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400'}`}>
      <span className="truncate">{selected.size > 0 ? `${label} (${selected.size})` : label}</span>
      <ChevronDown size={14} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <>
        <div className="fixed inset-0 z-10" onClick={onOpen} />
        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl z-50 p-2 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-1">
            {options.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selected.has(opt.value) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-zinc-600 dark:text-zinc-400'}`}>
                <input type="checkbox" className="hidden" checked={selected.has(opt.value)} onChange={() => onToggle(opt.value)} />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selected.has(opt.value) ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-700'}`}>
                  {selected.has(opt.value) && <Check size={10} className="text-white" />}
                </div>
                <span className="text-[10px] uppercase font-black truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);

export default Reports;
