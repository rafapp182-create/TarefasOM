
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Grupo } from '../types';
import { CheckCircle2, Clock, AlertCircle, BarChart3, Users, ClipboardList, TrendingUp, Activity, PieChart } from 'lucide-react';

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
    const total = tasks.length;
    const executada = tasks.filter(t => t.status === 'Executada').length;
    const emAndamento = tasks.filter(t => t.status === 'Em andamento').length;
    const naoExecutada = tasks.filter(t => t.status === 'Não executada').length;
    const pendente = tasks.filter(t => t.status === 'Pendente').length;
    return { total, executada, emAndamento, naoExecutada, pendente };
  }, [tasks]);

  const shiftData = useMemo(() => ({
    A: tasks.filter(t => t.shift === 'A' && t.status === 'Executada').length,
    B: tasks.filter(t => t.shift === 'B' && t.status === 'Executada').length,
    C: tasks.filter(t => t.shift === 'C' && t.status === 'Executada').length,
    D: tasks.filter(t => t.shift === 'D' && t.status === 'Executada').length,
  }), [tasks]);

  const maxShiftTasks = Math.max(...(Object.values(shiftData) as number[]), 1);
  const completionRate = stats.total > 0 ? Math.round((stats.executada / stats.total) * 100) : 0;
  
  // Casting explícito para garantir que o TS não reclame de operações aritméticas
  const pExec: number = stats.total > 0 ? (stats.executada as number / stats.total as number) * 100 : 0;
  const pAndamento: number = stats.total > 0 ? (stats.emAndamento as number / stats.total as number) * 100 : 0;
  const pPendente: number = stats.total > 0 ? (stats.pendente as number / stats.total as number) * 100 : 0;

  const stops = [
    `${pExec.toFixed(2)}%`, 
    `${(pExec + pAndamento).toFixed(2)}%`, 
    `${(pExec + pAndamento + pPendente).toFixed(2)}%`
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-black dark:text-white">
      <Activity className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase">Calculando Indicadores...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tighter">Dashboards OmPro</h2>
          <p className="text-xs text-zinc-500 font-medium italic">Performance Live.</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-500 uppercase">Eficiência</p>
            <p className="text-2xl font-black text-blue-600">{completionRate}%</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completionRate > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
            <TrendingUp />
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
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-black text-black dark:text-white uppercase mb-8 flex items-center gap-3">
            <Users size={18} className="text-blue-600" /> Produção por Turno
          </h3>
          <div className="relative h-60 flex items-end gap-2 md:gap-4 px-2 border-b border-gray-100 dark:border-zinc-800">
            {(Object.entries(shiftData) as [string, number][]).map(([shift, count]) => {
              const barHeight = (count / maxShiftTasks) * 100;
              return (
                <div key={shift} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="text-[10px] font-black text-black dark:text-white mb-1">{count}</div>
                  <div 
                    style={{ height: `${Math.max(barHeight, 5)}%` }} 
                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-1000 ${shift === 'A' ? 'bg-blue-600' : shift === 'B' ? 'bg-indigo-600' : shift === 'C' ? 'bg-violet-600' : 'bg-purple-600'}`} 
                  />
                  <div className="mt-2 text-[10px] font-black text-zinc-500 uppercase">{shift}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 flex flex-col items-center">
          <h3 className="text-sm font-black text-black dark:text-white uppercase mb-8 self-start">
            <PieChart size={18} className="text-blue-600" /> Status Geral
          </h3>
          <div 
            className="relative w-32 h-32 md:w-40 md:h-40 mb-6 flex items-center justify-center rounded-full" 
            style={{ background: stats.total > 0 ? `conic-gradient(#10b981 0% ${stops[0]}, #3b82f6 ${stops[0]} ${stops[1]}, #f59e0b ${stops[1]} ${stops[2]}, #f43f5e ${stops[2]} 100%)` : '#e5e7eb' }}
          >
            <div className="absolute inset-4 md:inset-5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-xl md:text-2xl font-black text-black dark:text-white">{stats.total}</span>
            </div>
          </div>
          <div className="w-full space-y-2">
            <LegendItem color="bg-emerald-500" label="Executadas" value={stats.executada} />
            <LegendItem color="bg-blue-500" label="Andamento" value={stats.emAndamento} />
            <LegendItem color="bg-amber-500" label="Pendentes" value={stats.pendente} />
            <LegendItem color="bg-rose-500" label="Não Exec." value={stats.naoExecutada} />
          </div>
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string; value: number }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between text-[10px] font-black uppercase border-b border-gray-50 dark:border-zinc-800 pb-1.5 last:border-0">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-zinc-500">{label}</span>
    </div>
    <span className="text-black dark:text-white">{value}</span>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
  const themes: Record<string, string> = { blue: 'bg-blue-600', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
  return (
    <div className={`p-6 rounded-3xl shadow-lg text-white ${themes[color]}`}>
      <div className="mb-4 opacity-70">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
};

export default Overview;
