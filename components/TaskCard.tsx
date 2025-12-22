
import React from 'react';
import { Task, UserProfile, TaskStatus } from '../types';
import { Info, Trash2, Briefcase, Eye, Calendar, Clock } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TaskCardProps {
  task: Task;
  profile: UserProfile;
  onOpenDetails: () => void;
  variant?: 'list' | 'card';
}

const TaskCard: React.FC<TaskCardProps> = ({ task, profile, onOpenDetails, variant = 'card' }) => {
  const isExecutor = profile.role === 'executor';

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'Executada': return 'bg-emerald-500 text-white';
      case 'Em andamento': return 'bg-blue-500 text-white';
      case 'Não executada': return 'bg-rose-500 text-white';
      default: return 'bg-gray-200 text-black';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Excluir OM ${task.omNumber}?`)) {
      try {
        await deleteDoc(doc(db, 'tarefas', task.id));
      } catch (err) {
        alert("Erro ao excluir.");
      }
    }
  };

  // Visualização de Tabela (Desktop Only via Parent)
  if (variant === 'list') {
    return (
      <tr className="hover:bg-blue-50/30 transition-colors group">
        <td className="px-6 py-4">
          <div className="font-mono font-black text-black text-sm">{task.omNumber}</div>
        </td>
        <td className="px-6 py-4">
          <div className="font-bold text-black text-sm max-w-xs truncate">{task.description}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-black font-bold text-[10px] uppercase">{task.workCenter}</div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="text-[10px] font-black text-black opacity-60">
            {task.minDate || '-'} > {task.maxDate || '-'}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter inline-block ${getStatusStyle(task.status)}`}>
            {task.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onOpenDetails} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
              {isExecutor ? <Eye size={18} /> : <Info size={18} />}
            </button>
            {profile.role === 'gerente' && (
              <button onClick={handleDelete} className="p-2 text-gray-300 hover:text-rose-600 rounded-lg">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Visualização de Card (Mobile Optimized)
  return (
    <div 
      onClick={onOpenDetails}
      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
    >
      {/* Indicador Lateral de Status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusStyle(task.status)}`} />
      
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">OM {task.omNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${getStatusStyle(task.status)}`}>
                {task.status}
              </span>
            </div>
            <h3 className="font-black text-black leading-tight text-sm uppercase tracking-tight line-clamp-2">
              {task.description}
            </h3>
          </div>
          {profile.role === 'gerente' && (
            <button onClick={handleDelete} className="p-2 text-rose-50 rounded-lg text-rose-600">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <Briefcase size={12} className="text-gray-400" />
            <span className="text-[10px] font-bold text-black uppercase truncate">{task.workCenter}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-[10px] font-bold text-black uppercase">{task.maxDate || '-'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase italic">
            <Clock size={10} />
            {new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
            {isExecutor ? 'Ver' : 'Editar'} <Info size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
