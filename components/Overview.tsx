
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  PieChart,
  CalendarDays
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

  // Explicitly typing stats to ensure properties are recognized as numbers for arithmetic operations
  // Renamed nãoExecutada to naoExecutada to avoid non-ASCII character issues in some environments
  const stats = useMemo<{
    total: number;
    executada: number;
    emAndamento: number;
    naoExecutada: number;
    pendente: number;
  }>(() => {
    return {
      total: tasks.length,
      executada: tasks.filter(t => t.status === 'Executada').length,
      emAndamento: tasks.filter(t => t.status === 'Em andamento').length,
      naoExecutada: tasks.filter(t => t.status === 'Não executada').length,
      pendente: tasks.filter(t => t.status === 'Pendente').length,
    };
  }, [tasks]);

  // Typing shiftData explicitly as Record<string, number> to help Object.values inference
  const shiftData = useMemo<Record<string, number>>(() => ({
    A: tasks.filter(t => t.shift === 'A' && t.status === 'Executada').length,
    B: tasks.filter(t => t.shift === 'B' && t.status === 'Executada').length,
    C: tasks.filter(t => t.shift === 'C' && t.status === 'Executada').length,
    D: tasks.filter(t => t.shift === 'D' && t.status === 'Executada').length,
  }), [tasks]);

  // Calculation of production in the last 7 days for the line chart
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    return last7Days.map(date => {
      const count = tasks.filter(t => {
        if (t.status !== 'Executada') return false;
        const taskDate = new Date(t.updatedAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === date.getTime();
      }).length;
      return {
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        value: count
      };
    });
  }, [tasks]);

  // Using a cast to number[] for Object.values(shiftData) to resolve spread assignment error
  const maxShiftTasks = Math.max(...(Object.values(shiftData) as number[]), 1);
  const maxTrendTasks = Math.max(...trendData.map(d => d.value), 1);
  const completionRate = stats.total > 0 ? Math.round((stats.executada / stats.total) * 100) : 0;

  // Pre-calculate percentages for the donut chart to ensure arithmetic safety
  const pExec = stats.total > 0 ? (stats.executada / stats.total) * 100 : 0;
  const pAndamento = stats.total > 0 ? (stats.emAndamento / stats.total) * 100 : 0;
  const pPendente = stats.total > 0 ? (stats.pendente / stats.total) * 100 : 0;

  // Fix: Pre-calculate sums for the conic-gradient stops to avoid arithmetic operations directly in the template literal,
  // which can lead to vague TypeScript "left-hand side of an arithmetic operation" errors on line 153.
  const stop1 = pExec;
  const stop2 = pExec + pAndamento;
  const stop3 = pExec + pAndamento + pPendente;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20">
        <Activity className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-black font-black uppercase tracking-widest text-xs">Calculando indicadores...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Dashboards OmPro</h2>
          <p className="text-black font-medium italic">Indicadores de performance industrial em tempo real.</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-black uppercase tracking-widest">Efficiency Rate</p>
            <p className="text-2xl font-black text-blue-600 leading-none">{completionRate}%</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${completionRate > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<ClipboardList size={24} />} label="Total OMs" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle2 size={24} />} label="Concluídas" value={stats.executada} color="emerald" subtitle={`${Math.round((stats.executada/stats.total || 0) * 100)}% de sucesso`} />
        <StatCard icon={<Clock size={24} />} label="Em Campo" value={stats.emAndamento} color="amber" />
        <StatCard icon={<AlertCircle size={24} />} label="Paradas/Não Exec" value={stats.naoExecutada} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Barras - Produção por Turno */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-3">
              <Users size={20} className="text-blue-600" /> Produção por Turno
            </h3>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-500" />
                 <span className="text-[10px] font-black text-black uppercase tracking-widest">Executadas</span>
               </div>
            </div>
          </div>
          
          <div className="relative h-72 flex items-end">
            {/* Eixo Y */}
            <div className="absolute left-0 h-full w-px bg-gray-100 flex flex-col justify-between py-2 text-[10px] font-black text-black/40 pr-2 items-end">
              <span>{maxShiftTasks}</span>
              <span>{Math.round(maxShiftTasks/2)}</span>
              <span>0</span>
            </div>

            <div className="flex-1 flex items-end justify-around ml-8 h-64 gap-4 px-4 border-b border-gray-100">
              {Object.entries(shiftData).map(([shift, count]) => {
                const height = (count / maxShiftTasks) * 100;
                return (
                  <div key={shift} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute -top-6 text-[10px] font-black text-black opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm border border-gray-100 z-10">
                      {count} OMs
                    </div>
                    <div 
                      style={{ height: `${Math.max(height, 2)}%` }}
                      className={`w-full max-w-[50px] rounded-t-xl transition-all duration-700 ease-out cursor-pointer relative bar-grow ${
                        shift === 'A' ? 'bg-blue-600' :
                        shift === 'B' ? 'bg-indigo-600' :
                        shift === 'C' ? 'bg-violet-600' : 'bg-purple-600'
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="mt-4 text-xs font-black text-black uppercase">Turno {shift}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Donut Chart - Distribuição de Status */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-3 mb-8">
            <PieChart size={20} className="text-blue-600" /> Status Geral
          </h3>
          
          <div className="flex-1 flex flex-col justify-center items-center">
             <div className="relative w-48 h-48 mb-10">
                <div 
                  className="w-full h-full rounded-full transition-all duration-1000"
                  style={{
                    background: stats.total > 0 
                      ? `conic-gradient(
                          #10b981 0% ${stop1}%, 
                          #3b82f6 ${stop1}% ${stop2}%,
                          #f59e0b ${stop2}% ${stop3}%,
                          #f43f5e ${stop3}% 100%
                        )`
                      : '#f3f4f6'
                  }}
                >
                  <div className="absolute inset-6 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[10px] font-black text-black uppercase leading-none opacity-50">Volume Total</span>
                    <span className="text-4xl font-black text-black">{stats.total}</span>
                  </div>
                </div>
             </div>

             <div className="w-full space-y-3">
                <LegendItem color="bg-emerald-500" label="Executadas" value={stats.executada} />
                <LegendItem color="bg-blue-500" label="Em Andamento" value={stats.emAndamento} />
                <LegendItem color="bg-amber-500" label="Pendentes" value={stats.pendente} />
                <LegendItem color="bg-rose-500" label="Não Executadas" value={stats.naoExecutada} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Linha - Tendência de Produção (7 dias) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-3">
              <CalendarDays size={20} className="text-blue-600" /> Tendência de Execução (7d)
            </h3>
            <span className="text-[10px] font-black text-black uppercase bg-blue-50 px-3 py-1 rounded-full">Histórico Diário</span>
          </div>

          <div className="h-48 w-full flex items-end justify-between px-2 pb-6 border-b border-gray-100">
             {trendData.map((day, i) => {
               const height = (day.value / maxTrendTasks) * 100;
               return (
                 <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                   <div className="absolute -top-6 text-[10px] font-black text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                     {day.value} OMs
                   </div>
                   <div 
                    style={{ height: `${Math.max(height, 10)}%` }}
                    className="w-2 bg-blue-600 rounded-full transition-all duration-500 group-hover:w-4 group-hover:bg-blue-800"
                   />
                   <div className="mt-4 text-[9px] font-black text-black uppercase">{day.label}</div>
                 </div>
               );
             })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-black opacity-60 italic">
            <Activity size={12} /> Total executado no período: {trendData.reduce((acc, curr) => acc + curr.value, 0)} OMs
          </div>
        </div>

        {/* Progress by Group */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-3">
              <BarChart3 size={20} className="text-blue-600" /> Progresso por Aba/Grupo
            </h3>
          </div>
          <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {grupos.length > 0 ? grupos.map(grupo => {
              const groupTasks = tasks.filter(t => t.groupId === grupo.id);
              const groupDone = groupTasks.filter(t => t.status === 'Executada').length;
              const perc = groupTasks.length > 0 ? Math.round((groupDone / groupTasks.length) * 100) : 0;
              
              return (
                <div key={grupo.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-black uppercase tracking-tight">{grupo.name}</span>
                    <span className="text-xs font-black text-blue-600">{perc}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-black uppercase opacity-60">
                    <span>{groupDone} concluídas</span>
                    <span>{groupTasks.length} total</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-20 text-black">
                <p className="text-xs font-black uppercase tracking-widest">Nenhuma aba disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[10px] font-black text-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-xs font-black text-black">{value}</span>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string; subtitle?: string }> = ({ icon, label, value, color, subtitle }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600 shadow-blue-100 text-white border-blue-700',
    emerald: 'bg-emerald-500 shadow-emerald-100 text-white border-emerald-600',
    amber: 'bg-amber-500 shadow-amber-100 text-white border-amber-600',
    rose: 'bg-rose-500 shadow-rose-100 text-white border-rose-600',
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border-b-8 transition-all hover:translate-y-[-4px] ${colors[color]}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-white/20 rounded-2xl">{icon}</div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
        <p className="text-4xl font-black leading-none tracking-tighter">{value}</p>
        {subtitle && <p className="text-[10px] font-bold mt-3 opacity-90 uppercase tracking-tight bg-black/10 px-2 py-1 rounded w-fit">{subtitle}</p>}
      </div>
    </div>
  );
};

export default Overview;
