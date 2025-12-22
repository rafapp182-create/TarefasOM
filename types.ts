
export type UserRole = 'gerente' | 'administrador' | 'executor';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Executada' | 'Não executada';
export type Shift = 'A' | 'B' | 'C' | 'D';

export interface Grupo {
  id: string;
  name: string;
  createdAt: number;
}

export interface Task {
  id: string;
  groupId: string;
  omNumber: string;
  description: string;
  workCenter: string; // Alterado de costCenter para workCenter
  minDate: string;
  maxDate: string;
  status: TaskStatus;
  shift?: Shift;
  reason?: string;
  excelData: Record<string, any>;
  updatedAt: number;
  updatedBy: string;
  updatedByEmail: string;
}

export interface HistoryEntry {
  timestamp: number;
  status: TaskStatus;
  shift?: Shift;
  reason?: string;
  user: string;
}
