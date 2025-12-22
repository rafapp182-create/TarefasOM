
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo, TaskStatus, Shift } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Activity,
  ArrowUpRight
} from 'lucide-react';

const Overview: React.FC<{ grupos: Grupo[] }> = ({ grupos }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tarefas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = {
    total: tasks.length,
    executada: tasks.filter(t => t.status === 'Executada').length,
    emAndamento: tasks.filter(t => t.status === 'Em andamento').length,
    nãoExecutada: tasks.filter(t => t.status === 'Não executada').length,
    pendente: tasks.filter(t => t.status === 'Pendente').length,
  };

  const shiftData = {
    A: tasks.filter(t => t.shift === 'A').length,
    B: tasks.filter(t => t.shift === 'B').length,
    C: tasks.filter(t => t.shift === 'C').length,
    D: tasks.filter(t => t.shift === 'D').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.executada / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20">
        <Activity className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Calculando indicadores...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Visão Geral</h2>
          <p className="text-gray-500 font-medium italic">Monitoramento de produtividade em tempo real.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa de Conclusão</p>
            <p className="text-2xl font-black text-blue-600 leading-none">{completionRate}%</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${completionRate > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<ClipboardList size={24} />} 
          label="Total de Tarefas" 
          value={stats.total} 
          color="blue" 
        />
        <StatCard 
          icon={<CheckCircle2 size={24} />} 
          label="Executadas" 
          value={stats.executada} 
          color="emerald" 
          subtitle={`${Math.round((stats.executada/stats.total || 0) * 100)}% do total`}
        />
        <StatCard 
          icon={<Clock size={24} />} 
          label="Em Andamento" 
          value={stats.emAndamento} 
          color="amber" 
        />
        <StatCard 
          icon={<AlertCircle size={24} />} 
          label="Não Executadas" 
          value={stats.nãoExecutada} 
          color="rose" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shift Breakdown */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
              <Users size={20} className="text-blue-600" /> Produtividade por Turno
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(shiftData).map(([shift, count]) => (
              <div key={shift} className="bg-gray-50 rounded-3xl p-6 text-center border border-gray-100 hover:border-blue-200 transition-all group">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Turno</span>
                <span className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{shift}</span>
                <p className="text-sm font-bold text-gray-500 mt-2">{count} OMs</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress by Group */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
              <BarChart3 size={20} className="text-blue-600" /> Status por Grupo
            </h3>
          </div>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {grupos.length > 0 ? grupos.map(grupo => {
              const groupTasks = tasks.filter(t => t.groupId === grupo.id);
              const groupDone = groupTasks.filter(t => t.status === 'Executada').length;
              const perc = groupTasks.length > 0 ? Math.round((groupDone / groupTasks.length) * 100) : 0;
              
              return (
                <div key={grupo.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Aba</span>
                      <span className="text-sm font-black text-gray-800 uppercase">{grupo.name}</span>
                    </div>
                    <span className="text-xs font-black text-blue-600">{perc}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>{groupDone} concluídas</span>
                    <span>{groupTasks.length} total</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-xs font-black uppercase tracking-widest">Nenhum grupo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Updates Summary Card */}
      <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Activity size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-2 flex items-center gap-2">
            Status Operacional <ArrowUpRight className="text-emerald-400" />
          </h3>
          <p className="text-gray-400 text-sm max-w-md font-medium leading-relaxed">
            O sistema está sincronizado. Atualmente existem <span className="text-white font-black">{stats.pendente}</span> ordens de manutenção aguardando início da execução.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string; subtitle?: string }> = ({ icon, label, value, color, subtitle }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600 shadow-blue-100 text-white',
    emerald: 'bg-emerald-500 shadow-emerald-100 text-white',
    amber: 'bg-amber-500 shadow-amber-100 text-white',
    rose: 'bg-rose-500 shadow-rose-100 text-white',
  };

  return (
    <div className={`p-8 rounded-[2.5rem] shadow-xl transition-all hover:scale-[1.02] ${colors[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/20 rounded-2xl">{icon}</div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
        <p className="text-4xl font-black leading-none">{value}</p>
        {subtitle && <p className="text-[10px] font-bold mt-2 opacity-80 uppercase tracking-tight">{subtitle}</p>}
      </div>
    </div>
  );
};

export default Overview;
