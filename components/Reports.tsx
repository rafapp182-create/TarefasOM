
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo } from '../types';
import { FileDown, Search, Loader2, Table } from 'lucide-react';
import * as XLSX from 'xlsx';

const Reports: React.FC<{ grupos: Grupo[] }> = ({ grupos }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
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
      t.omNumber.includes(filterSearch);
    
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
    XLSX.writeFile(wb, `Relatorio_LiveTask_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Relatórios de Campo</h2>
          <p className="text-gray-500 text-sm">Visualize e extraia dados consolidados das tarefas.</p>
        </div>
        <button 
          onClick={exportToExcel}
          disabled={filteredTasks.length === 0}
          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
        >
          <FileDown size={20} />
          Exportar (.xlsx)
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Busca OM/Desc</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500"
              placeholder="Digite aqui..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrar Aba</label>
          <select 
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500"
          >
            <option value="">Todas</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrar Status</label>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="Executada">Executada</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Não executada">Não executada</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrar Turno</label>
          <select 
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
            <option value="D">Turno D</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-5">Nº OM</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Turno</th>
                <th className="px-6 py-5">Data Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTasks.map(t => (
                <tr key={t.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 font-mono font-black text-gray-900">{t.omNumber}</td>
                  <td className="px-6 py-5 text-gray-600 font-bold max-w-xs truncate">{t.description}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      t.status === 'Executada' ? 'bg-emerald-500 text-white' : 
                      t.status === 'Em andamento' ? 'bg-blue-500 text-white' :
                      t.status === 'Não executada' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-black text-gray-900">{t.shift || '-'}</td>
                  <td className="px-6 py-5 text-xs text-gray-400 font-bold">
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
            <Table className="mx-auto w-12 h-12 text-gray-200" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Nenhum dado encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
