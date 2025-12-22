
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

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      executada: tasks.filter(t => t.status === 'Executada').length,
      emAndamento: tasks.filter(t => t.status === 'Em andamento').length,
      naoExecutada: tasks.filter(t => t.status === 'Não executada').length,
      pendente: tasks.filter(t => t.status === 'Pendente').length,
    };
  }, [tasks]);

  const shiftData = useMemo(() => ({
    A: tasks.filter(t => t.shift === 'A' && t.status === 'Executada').length,
    B: tasks.filter(t => t.shift === 'B' && t.status === 'Executada').length,
    C: tasks.filter(t => t.shift === 'C' && t.status === 'Executada').length,
    D: tasks.filter(t => t.shift === 'D' && t.status === 'Executada').length,
  }), [tasks]);

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

  const maxShiftTasks = Math.max(...(Object.values(shiftData) as number[]), 1);
  const maxTrendTasks = Math.max(...trendData.map(d => d.value), 1);
  const completionRate = stats.total > 0 ? Math.round((stats.executada / stats.total) * 100) : 0;

  // Use explicit numeric types and wrap additions in parentheses for template literals
  // This resolves the error: "The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type."
  const pExec: number = stats.total > 0 ? (stats.executada / stats.total) * 100 : 0;
  const pAndamento: number = stats.total > 0 ? (stats.emAndamento / stats.total) * 100 : 0;
  const pPendente: number = stats.total > 0 ? (stats.pendente / stats.total) * 100 : 0;

  const stop1 = `${pExec}%`;
  const stop2 = `${(pExec + pAndamento)}%`;
  const stop3 = `${(pExec + pAndamento + pPendente)}%`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12">
        <Activity className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-black">Calculando Indicadores...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter">Dashboards OmPro</h2>
          <p className="text-xs md:text-sm text-black font-medium italic">Performance em tempo real.</p>
        </div>
        <div className="bg-white px-4 py-3 md:px-6 md:py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 w-full md:w-auto">
          <div className="text-right">
            <p className="text-[10px] font-black text-black uppercase tracking-widest">Eficiência Total</p>
            <p className="text-xl md:text-2xl font-black text-blue-600 leading-none">{completionRate}%</p>
          </div>
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${completionRate > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard icon={<ClipboardList size={20} />} label="Total OMs" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Concluídas" value={stats.executada} color="emerald" />
        <StatCard icon={<Clock size={20} />} label="Em Campo" value={stats.emAndamento} color="amber" />
        <StatCard icon={<AlertCircle size={20} />} label="Falhas" value={stats.naoExecutada} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Gráfico de Barras */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm overflow-hidden">
          <h3 className="text-base md:text-lg font-black text-black uppercase tracking-tight flex items-center gap-3 mb-6">
            <Users size={18} className="text-blue-600" /> Produção por Turno
          </h3>
          <div className="relative h-60 md:h-72 flex items-end">
            <div className="flex-1 flex items-end justify-around h-full gap-2 md:gap-4 px-2 border-b border-gray-100">
              {Object.entries(shiftData).map(([shift, count]) => {
                const height = (count / maxShiftTasks) * 100;
                return (
                  <div key={shift} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div className="text-[10px] font-black text-black mb-1">{count}</div>
                    <div style={{ height: `${Math.max(height, 5)}%` }} className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ${shift === 'A' ? 'bg-blue-600' : shift === 'B' ? 'bg-indigo-600' : shift === 'C' ? 'bg-violet-600' : 'bg-purple-600'}`} />
                    <div className="mt-2 text-[10px] font-black text-black uppercase">{shift}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-base md:text-lg font-black text-black uppercase tracking-tight flex items-center gap-3 mb-6">
            <PieChart size={18} className="text-blue-600" /> Status Geral
          </h3>
          <div className="flex flex-col items-center">
             <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6">
                <div 
                  className="w-full h-full rounded-full"
                  style={{
                    background: stats.total > 0 
                      ? `conic-gradient(#10b981 0% ${stop1}, #3b82f6 ${stop1} ${stop2}, #f59e0b ${stop2} ${stop3}, #f43f5e ${stop3} 100%)`
                      : '#f3f4f6'
                  }}
                >
                  <div className="absolute inset-4 md:inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-xl md:text-2xl font-black text-black">{stats.total}</span>
                  </div>
                </div>
             </div>
             <div className="w-full space-y-2">
                <LegendItem color="bg-emerald-500" label="Executadas" value={stats.executada} />
                <LegendItem color="bg-blue-500" label="Em Andamento" value={stats.emAndamento} />
                <LegendItem color="bg-amber-500" label="Pendentes" value={stats.pendente} />
                <LegendItem color="bg-rose-500" label="Não Exec." value={stats.naoExecutada} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-base font-black text-black uppercase tracking-tight flex items-center gap-3 mb-6">
            <CalendarDays size={18} className="text-blue-600" /> Tendência (7d)
          </h3>
          <div className="h-40 w-full flex items-end justify-between px-2 pb-2 border-b border-gray-100">
             {trendData.map((day, i) => {
               const height = (day.value / maxTrendTasks) * 100;
               return (
                 <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                   <div style={{ height: `${Math.max(height, 10)}%` }} className="w-1.5 md:w-2 bg-blue-600 rounded-full" />
                   <div className="mt-2 text-[8px] font-black text-black uppercase">{day.label}</div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-base font-black text-black uppercase tracking-tight flex items-center gap-3 mb-6">
            <BarChart3 size={18} className="text-blue-600" /> Progresso por Aba
          </h3>
          <div className="space-y-4 max-h-[240px] overflow-y-auto no-scrollbar">
            {grupos.map(grupo => {
              const gTasks = tasks.filter(t => t.groupId === grupo.id);
              const gDone = gTasks.filter(t => t.status === 'Executada').length;
              const perc = gTasks.length > 0 ? Math.round((gDone / gTasks.length) * 100) : 0;
              return (
                <div key={grupo.id} className="space-y-1">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase">
                    <span className="truncate max-w-[140px]">{grupo.name}</span>
                    <span className="text-blue-600">{perc}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${perc}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between text-[10px] font-black uppercase border-b border-gray-50 pb-1.5 last:border-0">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
    <span>{value}</span>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
  const themes: Record<string, string> = {
    blue: 'bg-blue-600 text-white',
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-500 text-white',
  };
  return (
    <div className={`p-4 md:p-6 rounded-2xl shadow-sm ${themes[color]}`}>
      <div className="mb-2 md:mb-4 opacity-70 scale-90 md:scale-100">{icon}</div>
      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
      <p className="text-xl md:text-3xl font-black leading-none">{value}</p>
    </div>
  );
};

export default Overview;
