
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo, UserProfile } from '../types';
import { CheckCircle2, Clock, AlertCircle, BarChart3, Users, ClipboardList, TrendingUp, Activity, PieChart, Layers, Hand } from 'lucide-react';

const Overview: React.FC<{ grupos: Grupo[]; profile: UserProfile }> = ({ grupos, profile }) => {
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
    const total = tasks.length;
    const executada = tasks.filter(t => t.status === 'Executada').length;
    const emAndamento = tasks.filter(t => t.status === 'Em andamento').length;
    const naoExecutada = tasks.filter(t => t.status === 'Não executada').length;
    const pendente = tasks.filter(t => t.status === 'Pendente').length;
    return { total, executada, emAndamento, naoExecutada, pendente };
  }, [tasks]);

  const groupStats = useMemo(() => {
    return grupos.map(grupo => {
      const groupTasks = tasks.filter(t => t.groupId === grupo.id);
      const total = groupTasks.length;
      const done = groupTasks.filter(t => t.status === 'Executada').length;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        name: grupo.name,
        total,
        done,
        perc
      };
    }).sort((a, b) => b.perc - a.perc);
  }, [tasks, grupos]);

  const shiftData = useMemo(() => ({
    A: tasks.filter(t => t.shift === 'A' && t.status === 'Executada').length,
    B: tasks.filter(t => t.shift === 'B' && t.status === 'Executada').length,
    C: tasks.filter(t => t.shift === 'C' && t.status === 'Executada').length,
    D: tasks.filter(t => t.shift === 'D' && t.status === 'Executada').length,
  }), [tasks]);

  const maxShiftTasks = Math.max(...(Object.values(shiftData) as number[]), 1);
  const completionRate = stats.total > 0 ? Math.round((stats.executada / stats.total) * 100) : 0;
  
  const pExec: number = stats.total > 0 ? (stats.executada / stats.total) * 100 : 0;
  const pAndamento: number = stats.total > 0 ? (stats.emAndamento / stats.total) * 100 : 0;
  const pPendente: number = stats.total > 0 ? (stats.pendente / stats.total) * 100 : 0;

  const stops = [
    `${pExec.toFixed(2)}%`, 
    `${(pExec + pAndamento).toFixed(2)}%`, 
    `${(pExec + pAndamento + pPendente).toFixed(2)}%`
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-black dark:text-white">
      <Activity className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Indicadores...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Hand className="text-amber-500 animate-bounce" size={20} />
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Olá, {profile.name.split(' ')[0]}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">Dashboards OmPro</h2>
          <p className="text-xs text-zinc-500 font-medium italic mt-2">Visão consolidada da operação em tempo real.</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-6 group hover:border-blue-500 transition-colors">
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Eficiência Global</p>
            <p className="text-3xl font-black text-blue-600">{completionRate}%</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${completionRate > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp size={28} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard icon={<ClipboardList />} label="Total OMs" value={stats.total} color="blue" />
        <StatCard icon={<CheckCircle2 />} label="Concluídas" value={stats.executada} color="emerald" />
        <StatCard icon={<Clock />} label="Em Campo" value={stats.emAndamento} color="amber" />
        <StatCard icon={<AlertCircle />} label="Falhas" value={stats.naoExecutada} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Gráfico de Turnos */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-black text-black dark:text-white uppercase mb-8 flex items-center gap-3">
            <Users size={18} className="text-blue-600" /> Produção por Turno
          </h3>
          <div className="relative h-60 flex items-end gap-2 md:gap-4 px-2 border-b border-gray-100 dark:border-zinc-800">
            {(Object.entries(shiftData) as [string, number][]).map(([shift, count]) => {
              const barHeight = (count / maxShiftTasks) * 100;
              return (
                <div key={shift} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-black text-black dark:text-white mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                  <div 
                    style={{ height: `${Math.max(barHeight, 5)}%` }} 
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-1000 ${shift === 'A' ? 'bg-blue-600' : shift === 'B' ? 'bg-indigo-600' : shift === 'C' ? 'bg-violet-600' : 'bg-purple-600'} hover:brightness-110 cursor-pointer`} 
                  />
                  <div className="mt-2 text-[10px] font-black text-zinc-500 uppercase">{shift}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Geral */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 flex flex-col items-center shadow-sm">
          <h3 className="text-sm font-black text-black dark:text-white uppercase mb-8 self-start">
            <PieChart size={18} className="text-blue-600" /> Status Geral
          </h3>
          <div 
            className="relative w-36 h-36 md:w-44 md:h-44 mb-8 flex items-center justify-center rounded-full transition-all duration-700 hover:rotate-6" 
            style={{ background: stats.total > 0 ? `conic-gradient(#10b981 0% ${stops[0]}, #3b82f6 ${stops[0]} ${stops[1]}, #f59e0b ${stops[1]} ${stops[2]}, #f43f5e ${stops[2]} 100%)` : '#e5e7eb' }}
          >
            <div className="absolute inset-5 md:inset-6 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-2xl md:text-3xl font-black text-black dark:text-white">{stats.total}</span>
            </div>
          </div>
          <div className="w-full space-y-3">
            <LegendItem color="bg-emerald-500" label="Executadas" value={stats.executada} />
            <LegendItem color="bg-blue-500" label="Andamento" value={stats.emAndamento} />
            <LegendItem color="bg-amber-500" label="Pendentes" value={stats.pendente} />
            <LegendItem color="bg-rose-500" label="Não Exec." value={stats.naoExecutada} />
          </div>
        </div>

        {/* Desempenho por Grupos (Abas) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 md:p-10 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-sm font-black text-black dark:text-white uppercase flex items-center gap-3">
              <Layers size={18} className="text-blue-600" /> Eficiência por Aba
            </h3>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ranking Live</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
            {groupStats.map((g, idx) => (
              <div key={idx} className="space-y-3 group cursor-default">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-0.5">Top {idx + 1}</span>
                    <span className="text-base font-black text-black dark:text-white uppercase truncate block max-w-[250px] group-hover:text-blue-600 transition-colors">{g.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-black dark:text-white">{g.perc}%</span>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{g.done}/{g.total} OMs</p>
                  </div>
                </div>
                <div className="h-4 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden p-1 shadow-inner">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full shadow-lg ${g.perc === 100 ? 'bg-emerald-500' : g.perc > 50 ? 'bg-blue-600' : 'bg-amber-500'}`}
                    style={{ width: `${g.perc}%` }}
                  />
                </div>
              </div>
            ))}
            {groupStats.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-3xl">
                <Activity size={40} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nenhuma aba ativa para análise de KPIs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between text-[11px] font-black uppercase border-b border-gray-50 dark:border-zinc-800 pb-2 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
    <span className="text-black dark:text-white">{value}</span>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
  const themes: Record<string, string> = { 
    blue: 'bg-blue-600 shadow-blue-100', 
    emerald: 'bg-emerald-500 shadow-emerald-100', 
    amber: 'bg-amber-500 shadow-amber-100', 
    rose: 'bg-rose-500 shadow-rose-100' 
  };
  return (
    <div className={`p-6 rounded-[2rem] shadow-xl text-white ${themes[color]} dark:shadow-none transition-all hover:scale-[1.05] hover:-translate-y-1 cursor-default relative overflow-hidden group`}>
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
        {icon}
      </div>
      <div className="mb-4 opacity-80">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-1">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
};

export default Overview;
