
import React from 'react';
import { Task, UserProfile, TaskStatus } from '../types';
import { Info, Trash2, Briefcase, Eye } from 'lucide-react';
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
      case 'Executada': return 'bg-emerald-500 text-white border-emerald-600';
      case 'Em andamento': return 'bg-blue-500 text-white border-blue-600';
      case 'Não executada': return 'bg-rose-500 text-white border-rose-600';
      default: return 'bg-zinc-200 text-black border-zinc-300';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Deseja excluir a OM ${task.omNumber} permanentemente?`)) {
      try {
        await deleteDoc(doc(db, 'tarefas', task.id));
      } catch (err) {
        alert("Erro ao excluir tarefa individual.");
      }
    }
  };

  if (variant === 'list') {
    return (
      <tr className="hover:bg-blue-50/50 transition-colors group border-b border-gray-100">
        <td className="px-6 py-4">
          <div className="font-mono font-black text-black text-sm">{task.omNumber}</div>
        </td>
        <td className="px-6 py-4">
          <div className="font-bold text-black text-sm max-w-md truncate" title={task.description}>
            {task.description}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 text-black font-bold text-xs uppercase">
            <Briefcase size={12} className="text-black" />
            {task.workCenter}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="text-[11px] font-black text-black bg-gray-100 px-2 py-1 rounded-lg">
            {task.minDate || '--/--/--'}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <div className="text-[11px] font-black text-black bg-gray-100 px-2 py-1 rounded-lg">
            {task.maxDate || '--/--/--'}
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter inline-block shadow-sm ${getStatusStyle(task.status)}`}>
            {task.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={onOpenDetails}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
              title={isExecutor ? "Visualizar Detalhes" : "Detalhes e Atualização"}
            >
              {isExecutor ? <Eye size={18} /> : <Info size={18} />}
            </button>
            {profile.role === 'gerente' && (
              <button 
                onClick={handleDelete}
                className="p-2 text-rose-300 hover:text-rose-600 rounded-xl transition-all"
                title="Excluir Tarefa"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative">
      <div className="flex flex-col h-full space-y-4">
        <div className="flex justify-between items-start">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusStyle(task.status)}`}>
            {task.status}
          </span>
          <span className="text-xs font-mono font-black text-black">OM: {task.omNumber}</span>
        </div>
        <h3 className="font-black text-black leading-tight line-clamp-2 uppercase text-sm">{task.description}</h3>
        <div className="flex gap-2">
          <button 
            onClick={onOpenDetails}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl text-xs font-black uppercase hover:bg-zinc-800 transition-all"
          >
            {isExecutor ? <Eye size={14} /> : <Info size={14} />} {isExecutor ? 'Ver Dados' : 'Detalhes'}
          </button>
          {profile.role === 'gerente' && (
            <button 
              onClick={handleDelete}
              className="p-3 bg-gray-100 text-rose-300 hover:text-rose-600 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
