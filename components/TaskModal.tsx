
import React, { useState } from 'react';
import { Task, UserProfile, TaskStatus, Shift, HistoryEntry } from '../types';
import { X, CheckCircle2, PlayCircle, XCircle, Clock, MessageSquare, Save, Info, Briefcase, History, User } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  profile: UserProfile;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, profile }) => {
  const [newStatus, setNewStatus] = useState<TaskStatus>(task.status);
  const [shift, setShift] = useState<Shift | ''>(task.shift || '');
  const [reason, setReason] = useState(task.reason || '');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'update' | 'details'>('update');

  const handleUpdate = async () => {
    if (!shift) {
      alert("O campo Turno (A, B, C ou D) é obrigatório.");
      return;
    }

    if ((newStatus === 'Em andamento' || newStatus === 'Não executada') && !reason.trim()) {
      alert("Para este status, é obrigatório informar um motivo.");
      return;
    }

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
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar tarefa.");
    } finally {
      setLoading(false);
    }
  };

  const shifts: Shift[] = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl md:rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                OM {task.omNumber}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <Briefcase size={12} /> {task.workCenter}
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter">{task.description}</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
            <X size={28} className="text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-50 px-8 shrink-0 bg-gray-50/30">
          <button 
            onClick={() => setActiveTab('update')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'update' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
          >
            Atualizar Status
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
          >
            Dados do Excel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'update' && (
            <div className="space-y-8">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Escolha o novo estado</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <StatusBtn 
                    active={newStatus === 'Executada'} 
                    onClick={() => setNewStatus('Executada')}
                    color="emerald" icon={<CheckCircle2 size={18} />} label="Executada" 
                  />
                  <StatusBtn 
                    active={newStatus === 'Em andamento'} 
                    onClick={() => setNewStatus('Em andamento')}
                    color="blue" icon={<PlayCircle size={18} />} label="Em andamento" 
                  />
                  <StatusBtn 
                    active={newStatus === 'Não executada'} 
                    onClick={() => setNewStatus('Não executada')}
                    color="rose" icon={<XCircle size={18} />} label="Não executada" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                    <Clock size={16} /> Turno <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {shifts.map(s => (
                      <button
                        key={s}
                        onClick={() => setShift(s)}
                        className={`w-14 h-14 rounded-2xl border-4 font-black text-lg transition-all ${shift === s ? 'bg-blue-600 border-blue-200 text-white shadow-xl shadow-blue-100' : 'bg-gray-50 border-gray-100 text-gray-300 hover:border-gray-200'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {(newStatus === 'Em andamento' || newStatus === 'Não executada') && (
                  <div className="animate-in fade-in slide-in-from-right-4">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                      <MessageSquare size={16} /> Motivo / Observação <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Descreva o motivo da alteração..."
                      className="w-full h-32 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-10 pb-10">
              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History size={14} /> Histórico Recente
                </h4>
                <div className="space-y-3">
                  {task.history && task.history.length > 0 ? (
                    [...task.history].reverse().slice(0, 10).map((entry, idx) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.status === 'Executada' ? 'bg-emerald-500' :
                            entry.status === 'Em andamento' ? 'bg-blue-500' :
                            entry.status === 'Não executada' ? 'bg-rose-500' : 'bg-gray-300'
                          }`} />
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase">{entry.status}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                              <User size={10} /> {entry.user} | Turno {entry.shift}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(entry.timestamp).toLocaleString()}</p>
                          {entry.reason && <p className="text-[10px] text-gray-500 italic mt-1 italic leading-tight max-w-[200px]">"{entry.reason}"</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} /> Dados Completos do Excel
                </h4>
                <div className="bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {Object.entries(task.excelData).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-4 hover:bg-white transition-colors">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter mr-4">{key}</span>
                      <span className="text-sm font-bold text-gray-900 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'update' && (
          <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 shrink-0">
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Processando..." : <><Save size={24} /> Salvar Alteração</>}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-5 bg-white border-2 border-gray-100 text-gray-400 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBtn: React.FC<{ active: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }> = ({ active, onClick, color, icon, label }) => {
  const colors: Record<string, string> = {
    emerald: active ? 'bg-emerald-600 border-emerald-200 text-white shadow-xl shadow-emerald-100 scale-105' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
    blue: active ? 'bg-blue-600 border-blue-200 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100',
    rose: active ? 'bg-rose-600 border-rose-200 text-white shadow-xl shadow-rose-100 scale-105' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-4 font-black uppercase tracking-widest text-xs transition-all ${colors[color]}`}
    >
      <div className={`${active ? 'scale-125' : ''} transition-transform`}>{icon}</div>
      <span>{label}</span>
    </button>
  );
};

export default TaskModal;
