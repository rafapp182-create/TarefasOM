
import React, { useState } from 'react';
import { Task, UserProfile, TaskStatus, Shift, HistoryEntry } from '../types';
import { X, CheckCircle2, PlayCircle, XCircle, Clock, MessageSquare, Save, Info, Briefcase, History, User, Eye } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  profile: UserProfile;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, profile }) => {
  const isExecutor = profile.role === 'executor';
  const [newStatus, setNewStatus] = useState<TaskStatus>(task.status);
  const [shift, setShift] = useState<Shift | ''>(task.shift || '');
  const [reason, setReason] = useState(task.reason || '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'update' | 'details'>(isExecutor ? 'details' : 'update');

  const handleUpdate = async () => {
    if (isExecutor) return;
    if (!shift) { alert("O turno é obrigatório."); return; }
    if ((newStatus === 'Em andamento' || newStatus === 'Não executada') && !reason.trim()) { alert("Motivo obrigatório."); return; }
    setLoading(true);
    try {
      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        status: newStatus,
        shift: shift as Shift,
        reason: reason,
        user: profile.name,
        userEmail: profile.email
      };
      await updateDoc(doc(db, 'tarefas', task.id), {
        status: newStatus,
        shift: shift,
        reason: reason,
        updatedAt: Date.now(),
        updatedBy: profile.uid,
        updatedByEmail: profile.email,
        history: arrayUnion(historyEntry)
      });
      onClose();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const shifts: Shift[] = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl md:rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">OM {task.omNumber}</span>
              <span className="text-black dark:text-zinc-600">/</span>
              <span className="text-black dark:text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Briefcase size={12} /> {task.workCenter}
              </span>
            </div>
            <h3 className="text-2xl font-black text-black dark:text-white leading-tight uppercase tracking-tighter">{task.description}</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={28} className="text-black dark:text-white" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-zinc-800 px-8 shrink-0 bg-gray-50 dark:bg-zinc-900/50">
          {!isExecutor && (
            <button onClick={() => setActiveTab('update')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 ${activeTab === 'update' ? 'border-blue-600 text-blue-600' : 'border-transparent text-black dark:text-zinc-500'}`}>Atualizar Status</button>
          )}
          <button onClick={() => setActiveTab('details')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-black dark:text-zinc-500'}`}>{isExecutor ? 'Visualizar' : 'Dados'}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'update' && !isExecutor && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatusBtn active={newStatus === 'Executada'} onClick={() => setNewStatus('Executada')} color="emerald" icon={<CheckCircle2 size={18} />} label="Executada" />
                <StatusBtn active={newStatus === 'Em andamento'} onClick={() => setNewStatus('Em andamento')} color="blue" icon={<PlayCircle size={18} />} label="Andamento" />
                <StatusBtn active={newStatus === 'Não executada'} onClick={() => setNewStatus('Não executada')} color="rose" icon={<XCircle size={18} />} label="Não Executada" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-black dark:text-white uppercase tracking-widest mb-4"><Clock size={16} /> Turno <span className="text-rose-500">*</span></label>
                <div className="flex gap-3">
                  {shifts.map(s => (
                    <button key={s} onClick={() => setShift(s)} className={`w-14 h-14 rounded-2xl border-4 font-black text-lg transition-all ${shift === s ? 'bg-blue-600 border-blue-200 dark:border-blue-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-black dark:text-white'}`}>{s}</button>
                  ))}
                </div>
              </div>
              {(newStatus === 'Em andamento' || newStatus === 'Não executada') && (
                <div className="animate-in slide-in-from-top-4">
                  <label className="flex items-center gap-2 text-xs font-black text-black dark:text-white uppercase tracking-widest mb-4"><MessageSquare size={16} /> Motivo <span className="text-rose-500">*</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-32 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 rounded-2xl p-4 text-sm font-bold text-black dark:text-white outline-none focus:border-blue-500" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-10 pb-10">
              <div>
                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Histórico</h4>
                <div className="space-y-3">
                  {task.history?.length ? [...task.history].reverse().slice(0, 10).map((entry, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${entry.status === 'Executada' ? 'bg-emerald-500' : entry.status === 'Em andamento' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                        <div><p className="text-xs font-black text-black dark:text-white uppercase">{entry.status}</p><p className="text-[10px] text-zinc-500 font-bold uppercase">{entry.user} | {entry.shift}</p></div>
                      </div>
                      <div className="text-right"><p className="text-[10px] font-black text-black dark:text-zinc-500 uppercase">{new Date(entry.timestamp).toLocaleString()}</p></div>
                    </div>
                  )) : <p className="text-center text-xs text-zinc-500 uppercase py-6">Vazio</p>}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 overflow-hidden divide-y divide-gray-200 dark:divide-zinc-800">
                {Object.entries(task.excelData).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-4"><span className="text-xs font-black text-zinc-500 uppercase">{k}</span><span className="text-sm font-bold text-black dark:text-white">{String(v)}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100 dark:border-zinc-800 bg-gray-100/50 dark:bg-zinc-900 flex flex-col md:flex-row gap-4 shrink-0">
          {!isExecutor && activeTab === 'update' ? (
            <button onClick={handleUpdate} disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"><Save size={24} /> {loading ? 'Sincronizando...' : 'Salvar Alteração'}</button>
          ) : (
            <button onClick={onClose} className="w-full py-5 bg-black dark:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95">Fechar</button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusBtn: React.FC<{ active: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }> = ({ active, onClick, color, icon, label }) => {
  const themes: Record<string, string> = {
    emerald: active ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    blue: active ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
    rose: active ? 'bg-rose-600 text-white border-rose-500' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
  };
  return <button onClick={onClick} className={`flex flex-col items-center gap-2 p-6 rounded-3xl border-4 font-black uppercase text-xs transition-all ${themes[color]}`}>{icon}<span>{label}</span></button>;
};

export default TaskModal;
