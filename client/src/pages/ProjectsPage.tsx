import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Project, Team } from '../types';
import { getTeamColors, daysUntilDeadline, isOverdue, formatDate, ALL_TEAMS } from '../lib/utils';

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'ALL' | Team>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (user?.role !== 'DEV' && filter === 'ALL') params.team = user?.team || '';
    else if (filter !== 'ALL') params.team = filter;
    api.get('/projects', { params }).then((r) => {
      setProjects(r.data);
      setLoading(false);
    });
  }, [filter, user]);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'DEV';

  function getProjectProgress(p: Project): number {
    if (!p.subtasks?.length) return 0;
    return Math.round(p.subtasks.reduce((sum, s) => sum + s.progress, 0) / p.subtasks.length);
  }

  function getStatusLabel(p: Project): { label: string; color: string } {
    const days = daysUntilDeadline(p.deadline);
    const progress = getProjectProgress(p);
    if (p.status === 'ARCHIVED') return { label: 'Archived', color: 'bg-[#E0E0E0] text-[#121212]' };
    if (days < 0) return { label: 'Overdue', color: 'bg-[#D02020] text-white' };
    if (days < 14 && progress < 70) return { label: 'At risk', color: 'bg-[#F0C020] text-[#121212]' };
    return { label: 'On track', color: 'bg-[#1040C0] text-white' };
  }

  const tabs: ('ALL' | Team)[] = user?.role === 'DEV'
    ? ['ALL', ...ALL_TEAMS.map((t) => t.value as Team)]
    : ['ALL'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#121212] bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black uppercase tracking-tight text-[#121212]">Projects</h1>
          {user?.role === 'DEV' && (
            <div className="flex border-2 border-[#121212]">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                    filter === t
                      ? 'bg-[#121212] text-white'
                      : 'bg-white text-[#121212]/50 hover:bg-[#F0F0F0]'
                  }`}
                >
                  {t === 'ALL' ? 'All' : ALL_TEAMS.find((x) => x.value === t)?.label ?? t}
                </button>
              ))}
            </div>
          )}
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D02020] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] text-sm font-black uppercase tracking-wider hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 bg-[#F0F0F0]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border-2 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-5 animate-pulse">
                <div className="h-5 bg-[#E0E0E0] w-3/4 mb-4" />
                <div className="h-3 bg-[#E0E0E0] w-full mb-4" />
                <div className="h-4 bg-[#E0E0E0] w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#121212]/30 bg-white">
            <div className="flex gap-3 mb-4">
              <div className="w-6 h-6 bg-[#1040C0] border-2 border-[#121212]" />
              <div className="w-6 h-6 rounded-full bg-[#D02020] border-2 border-[#121212]" />
              <div className="w-6 h-6 bg-[#F0C020] border-2 border-[#121212] rotate-45" />
            </div>
            <p className="text-sm font-bold text-[#121212]/50 uppercase tracking-wider">No projects yet</p>
            {canCreate && (
              <button onClick={() => navigate('/projects/new')} className="mt-3 text-sm font-black uppercase tracking-wider text-[#D02020] hover:underline">
                Create the first one →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const progress = getProjectProgress(p);
              const status = getStatusLabel(p);
              const tc = getTeamColors(p.team);
              const days = daysUntilDeadline(p.deadline);
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-white border-2 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-5 cursor-pointer hover:-translate-y-1 transition-transform relative overflow-hidden"
                >
                  {/* Corner geometric decoration */}
                  <div className={`absolute top-0 right-0 w-8 h-8 border-l-2 border-b-2 border-[#121212] ${tc.badge.split(' ')[0]}`} />

                  <div className="mb-3 pr-6">
                    <h3 className="font-black text-[#121212] text-base leading-tight mb-2 truncate uppercase">{p.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${tc.badge}`}>
                        {p.team}
                      </span>
                      <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-bold text-[#121212]/50 mb-1.5 uppercase tracking-wide">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-[#E0E0E0] border-2 border-[#121212] overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          status.label === 'At risk' ? 'bg-[#F0C020]' :
                          status.label === 'Overdue' ? 'bg-[#D02020]' :
                          tc.bar
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-[#121212]/50 uppercase tracking-wide">
                    <span>{p.subtasks?.length || 0} subtask{p.subtasks?.length !== 1 ? 's' : ''}</span>
                    <span className={
                      isOverdue(p.deadline) ? 'text-[#D02020]' :
                      days < 14 ? 'text-[#F0C020]' : ''
                    }>
                      {isOverdue(p.deadline) ? `${Math.abs(days)}d overdue` : `Due ${formatDate(p.deadline)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
