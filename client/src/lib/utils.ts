import { format, startOfWeek, addDays } from 'date-fns';

export function getWeekDays(date: Date = new Date()): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d');
}

export function formatDateFull(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd');
}

export function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

const TEAM_MAP: Record<string, { hex: string; badge: string; chip: string; bar: string; border: string }> = {
  DEV:       { hex: '#1040C0', badge: 'bg-[#1040C0] text-white', chip: 'bg-[#1040C0] text-white', bar: 'bg-[#1040C0]', border: 'border-[#1040C0]' },
  CIVIL:     { hex: '#107050', badge: 'bg-[#107050] text-white', chip: 'bg-[#107050] text-white', bar: 'bg-[#107050]', border: 'border-[#107050]' },
  ADMIN:     { hex: '#C05810', badge: 'bg-[#C05810] text-white', chip: 'bg-[#C05810] text-white', bar: 'bg-[#C05810]', border: 'border-[#C05810]' },
  DESIGN:    { hex: '#7020A0', badge: 'bg-[#7020A0] text-white', chip: 'bg-[#7020A0] text-white', bar: 'bg-[#7020A0]', border: 'border-[#7020A0]' },
  MARKETING: { hex: '#006878', badge: 'bg-[#006878] text-white', chip: 'bg-[#006878] text-white', bar: 'bg-[#006878]', border: 'border-[#006878]' },
};
const FALLBACK_TEAM = { hex: '#121212', badge: 'bg-[#121212] text-white', chip: 'bg-[#121212] text-white', bar: 'bg-[#121212]', border: 'border-[#121212]' };

export function getTeamColors(team: string) {
  return TEAM_MAP[team] ?? FALLBACK_TEAM;
}

export const ALL_TEAMS: { value: string; label: string }[] = [
  { value: 'DEV',       label: 'Software'  },
  { value: 'CIVIL',     label: 'Civil'     },
  { value: 'ADMIN',     label: 'Admin'     },
  { value: 'DESIGN',    label: 'Design'    },
  { value: 'MARKETING', label: 'Marketing' },
];

// Wide palette — no red (#D02020), no black (#121212), no yellow (#F0C020)
const PROJECT_PALETTE = [
  '#1040C0', // cobalt blue
  '#107050', // forest green
  '#7020A0', // violet
  '#C05810', // burnt orange
  '#0070A0', // steel blue
  '#A02060', // berry
  '#006878', // dark teal
  '#5050B0', // periwinkle
  '#107830', // emerald
  '#B04080', // magenta
  '#2060A0', // royal blue
  '#706010', // olive
  '#008060', // jade
  '#903010', // rust
  '#304090', // indigo
];

export function getProjectColor(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_PALETTE[Math.abs(hash) % PROJECT_PALETTE.length];
}

export function getActivityChipColor(type: string): string {
  if (type === 'MEETING') return 'bg-[#F0C020] text-[#121212] font-bold';
  if (type === 'ADMIN') return 'bg-[#E0E0E0] text-[#121212] font-medium';
  return 'text-white font-bold'; // PROJECT — caller applies backgroundColor via style
}

export function isOverdue(deadline: string | Date): boolean {
  return new Date(deadline) < new Date();
}

export function daysUntilDeadline(deadline: string | Date): number {
  const now = new Date();
  const d = new Date(deadline);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const SUBTASK_COLORS = ['#1040C0', '#D02020', '#F0C020', '#121212', '#1040C0'];
export function getSubtaskColor(index: number): string {
  return SUBTASK_COLORS[index % SUBTASK_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
