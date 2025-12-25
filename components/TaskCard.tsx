
import React from 'react';
import { Task, UserProfile, TaskStatus } from '../types';
import { Info, Trash2, Briefcase, Eye, Calendar, Clock, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TaskCardProps {
  task: Task;
  profile: UserProfile;
  onOpenDetails: () => void;
  variant?: 'list' | 'card';
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, profile, onOpenDetails, variant = 'card', isSelected, onToggleSelection }) => {
  const isExecutor = profile.role === 'executor';

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'Executada': return 'bg-emerald-500 text-white';
      case 'Em andamento': return 'bg-blue-500 text-white';
      case 'Não executada': return 'bg-rose-500 text-white';
      default: return 'bg-gray-200 dark:bg-zinc-700 text-black dark:text-white';
    }
  };

  const getDateStatus = () => {
    if (!task.maxDate || task.status === 'Executada') return null;
    const parts = task.maxDate.split('/');
    if (parts.length !== 3) return null;
    const maxDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    maxDateObj.setHours(0, 0, 0, 0);
    if (maxDateObj < today) return 'vencida';
    if (maxDateObj.getTime() === today.getTime()) return 'hoje';
    return null;
  };

  const dateStatus = getDateStatus();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Excluir OM ${task.omNumber}?`)) {
      try {
        await deleteDoc(doc(db, 'tarefas', task.id));
      } catch (err) { alert("Erro ao excluir."); }
    }
  };

  if (variant === 'list') {
    return (
      <tr className={`hover:bg-blue-50/30 dark:hover:bg-zinc-800 transition-colors group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : dateStatus ? 'bg-rose-50/20 dark:bg-rose-900/5' : ''}`}>
        <td className="px-6 py-4">
          <button onClick={handleToggle} className={`${isSelected ? 'text-blue-600' : 'text-zinc-300 dark:text-zinc-600'}`}>
            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
        </td>
        <td className="px-4 py-4">
          <div className="font-mono font-black text-black dark:text-white text-sm">{task.omNumber}</div>
        </td>
        <td className="px-6 py-4">
          <div className="font-bold text-black dark:text-zinc-200 text-sm max-w-xs truncate">{task.description}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-black dark:text-zinc-400 font-bold text-[10px] uppercase">{task.workCenter}</div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className={`text-[10px] font-black flex items-center justify-center gap-1 ${dateStatus ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-zinc-500 opacity-60'}`}>
            {task.minDate || '-'} &rarr; {task.maxDate || '-'}
            {dateStatus && <AlertTriangle size={12} className="animate-pulse" />}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter inline-block ${getStatusStyle(task.status)}`}>
            {task.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onOpenDetails} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg">
              {isExecutor ? <Eye size={18} /> : <Info size={18} />}
            </button>
            {profile.role === 'gerente' && (
              <button onClick={handleDelete} className="p-2 text-gray-300 dark:text-zinc-600 hover:text-rose-600 rounded-lg">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div 
      onClick={onOpenDetails}
      className={`bg-white dark:bg-zinc-900 border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : dateStatus ? 'border-rose-200 dark:border-rose-900/50 shadow-rose-100/50' : 'border-gray-100 dark:border-zinc-800'} rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSelected ? 'bg-blue-600' : dateStatus ? 'bg-rose-600' : getStatusStyle(task.status)}`} />
      
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button onClick={handleToggle} className={`${isSelected ? 'text-blue-600' : 'text-zinc-200 dark:text-zinc-800'}`}>
          {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-start pr-8">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">OM {task.omNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${getStatusStyle(task.status)}`}>
                {task.status}
              </span>
            </div>
            <h3 className={`font-black leading-tight text-sm uppercase tracking-tight line-clamp-2 ${dateStatus ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
              {task.description}
            </h3>
          </div>
        </div>

        {dateStatus && (
          <div className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-sm">
            <AlertTriangle size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              {dateStatus === 'vencida' ? 'VENCIDA' : 'VENCE HOJE'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Briefcase size={12} className="text-gray-400 dark:text-zinc-500" />
            <span className="text-[10px] font-bold text-black dark:text-zinc-400 uppercase truncate">{task.workCenter}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Calendar size={12} className={dateStatus ? 'text-rose-500' : 'text-gray-400 dark:text-zinc-500'} />
            <span className={`text-[10px] font-bold uppercase ${dateStatus ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-black dark:text-zinc-400'}`}>
              {task.maxDate || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
