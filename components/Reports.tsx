
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo } from '../types';
import { FileDown, Search, Loader2, Table, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC<{ grupos: Grupo[] }> = ({ grupos }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'tarefas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredTasks = tasks.filter(t => {
    const matchGroup = !filterGroup || t.groupId === filterGroup;
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchShift = !filterShift || t.shift === filterShift;
    const matchSearch = !filterSearch || 
      t.description.toLowerCase().includes(filterSearch.toLowerCase()) || 
      t.omNumber.toLowerCase().includes(filterSearch.toLowerCase());
    
    return matchGroup && matchStatus && matchShift && matchSearch;
  });

  const exportToExcel = () => {
    const dataToExport = filteredTasks.map(t => ({
      'Nº OM': t.omNumber,
      'Descrição': t.description,
      'Centro de Trabalho': t.workCenter,
      'Status': t.status,
      'Turno': t.shift || 'N/A',
      'Motivo': t.reason || '',
      'Data Min': t.minDate,
      'Data Max': t.maxDate,
      'Atualizado por': t.updatedByEmail,
      'Data de Atualização': new Date(t.updatedAt).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `Relatorio_OmPro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(18);
    doc.text('Relatório de Manutenção - OmPro', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

    const tableRows = filteredTasks.map(t => [
      t.omNumber,
      t.description,
      t.workCenter,
      t.status,
      t.shift || 'N/A',
      t.reason || '-',
      t.updatedByEmail
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Nº OM', 'Descrição', 'C. Trabalho', 'Status', 'Turno', 'Motivo', 'Atualizado por']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        1: { cellWidth: 60 },
        5: { cellWidth: 40 }
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Relatorio gerado no sistema OmPro criado por Rafael', 14, pageHeight - 10);
        doc.text(`Página ${data.pageNumber}`, pageSize.width - 25, pageHeight - 10);
      }
    });

    doc.save(`Relatorio_OmPro_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">Relatórios de Campo</h2>
          <p className="text-zinc-500 text-sm">Visualize e extraia dados consolidados das tarefas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={exportToExcel}
            disabled={filteredTasks.length === 0}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl disabled:opacity-50 text-xs"
          >
            <FileDown size={18} /> Excel (.xlsx)
          </button>
          <button 
            onClick={exportToPDF}
            disabled={filteredTasks.length === 0}
            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl disabled:opacity-50 text-xs"
          >
            <FileText size={18} /> Gerar PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Busca OM/Desc</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-xl outline-none text-sm font-bold focus:border-blue-500 text-black dark:text-white"
              placeholder="Digite aqui..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Filtrar Aba</label>
          <select 
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-xl outline-none text-sm font-bold focus:border-blue-500 text-black dark:text-white"
          >
            <option value="">Todas</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Filtrar Status</label>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-xl outline-none text-sm font-bold focus:border-blue-500 text-black dark:text-white"
          >
            <option value="">Todos</option>
            <option value="Executada">Executada</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Não executada">Não executada</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Filtrar Turno</label>
          <select 
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-xl outline-none text-sm font-bold focus:border-blue-500 text-black dark:text-white"
          >
            <option value="">Todos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
            <option value="D">Turno D</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-5">Nº OM</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Turno</th>
                <th className="px-6 py-5">Data Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {filteredTasks.map(t => (
                <tr key={t.id} className="text-sm hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-5 font-mono font-black text-black dark:text-white">{t.omNumber}</td>
                  <td className="px-6 py-5 text-zinc-700 dark:text-zinc-300 font-bold max-w-xs truncate">{t.description}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      t.status === 'Executada' ? 'bg-emerald-500 text-white' : 
                      t.status === 'Em andamento' ? 'bg-blue-500 text-white' :
                      t.status === 'Não executada' ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-zinc-700 text-zinc-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-black text-black dark:text-white">{t.shift || '-'}</td>
                  <td className="px-6 py-5 text-xs text-zinc-400 font-bold">
                    {new Date(t.updatedAt).toLocaleDateString()} {new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>}
        {!loading && filteredTasks.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <Table className="mx-auto w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Nenhum dado encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
