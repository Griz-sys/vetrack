export type Role = 'USER' | 'ADMIN' | 'DEV';
export type Team = 'DEV' | 'CIVIL' | 'ADMIN' | 'DESIGN' | 'MARKETING';
export type Status = 'ACTIVE' | 'ARCHIVED';
export type ActivityType = 'PROJECT' | 'MEETING' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: Team;
  defaultHrs: number;
  admins?: { id: string; name: string }[];
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  userId: string;
  user: { id: string; name: string; team: Team };
  createdById: string;
  createdBy: { id: string; name: string };
  notes?: string | null;
  done: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  team: Team;
  status: Status;
  startDate: string;
  deadline: string;
  createdAt?: string;
  subtasks: Subtask[];
  _count?: { activities: number };
}

export interface Subtask {
  id: string;
  name: string;
  projectId: string;
  assignedTo?: string | null;
  progress: number;
}

export interface Activity {
  id: string;
  userId: string;
  user: { id: string; name: string; team: Team; role?: Role };
  date: string;
  type: ActivityType;
  projectId?: string | null;
  project?: { id: string; name: string; team: Team } | null;
  subtaskId?: string | null;
  subtask?: { id: string; name: string } | null;
  hours: number;
  notes?: string | null;
  blocker?: string | null;
  meetingType?: string | null;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}
