import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Project, Activity } from '../types';
import { getTeamColors, formatDate, formatHours, getSubtaskColor, getInitials, daysUntilDeadline, isOverdue } from '../lib/utils';
import { format } from 'date-fns';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project & { activities: Activity[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${id}`).then((r) => {
      setProject(r.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-5 space-y-4 bg-[#F0F0F0] h-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-white border-4 border-[#121212] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!project) return <div className="p-5 font-bold text-[#121212]/50 bg-[#F0F0F0] h-full">Project not found</div>;

  const tc = getTeamColors(project.team);
  const days = daysUntilDeadline(project.deadline);
  const overdue = isOverdue(project.deadline);
  const avgProgress = project.subtasks.length
    ? Math.round(project.subtasks.reduce((s, t) => s + t.progress, 0) / project.subtasks.length)
    : 0;

  const statusColor = project.status === 'ARCHIVED' ? 'bg-[#E0E0E0] text-[#121212]'
    : overdue ? 'bg-[#D02020] text-white'
    : days < 14 && avgProgress < 70 ? 'bg-[#F0C020] text-[#121212]'
    : 'bg-[#1040C0] text-white';
  const statusLabel = project.status === 'ARCHIVED' ? 'Archived'
    : overdue ? 'Overdue'
    : days < 14 && avgProgress < 70 ? 'At risk'
    : 'On track';

  return (
    <div className="flex flex-col h-full overflow-auto bg-[#F0F0F0]">
      {/* Header */}
      <div className="px-5 py-4 border-b-4 border-[#121212] bg-white">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-[#121212]/50 hover:text-[#121212] mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#121212] leading-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${tc.badge}`}>
                {project.team}
              </span>
              <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${statusColor}`}>
                {statusLabel}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wide ${
                overdue ? 'text-[#D02020]' : days < 14 ? 'text-[#F0C020]' : 'text-[#121212]/40'
              }`}>
                {overdue ? `${Math.abs(days)}d overdue` : `Due ${formatDate(project.deadline)}`}
              </span>
            </div>
          </div>
          {/* Big progress number */}
          <div className={`flex-shrink-0 w-20 h-20 border-4 border-[#121212] flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_#121212] ${
            overdue ? 'bg-[#D02020]' : days < 14 && avgProgress < 70 ? 'bg-[#F0C020]' : 'bg-[#1040C0]'
          }`}>
            <div className={`text-2xl font-black leading-none ${
              overdue ? 'text-white' : days < 14 && avgProgress < 70 ? 'text-[#121212]' : 'text-white'
            }`}>{avgProgress}%</div>
            <div className={`text-xs font-bold uppercase tracking-wide ${
              overdue ? 'text-white/70' : days < 14 && avgProgress < 70 ? 'text-[#121212]/60' : 'text-white/70'
            }`}>Done</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-[#E0E0E0] border-2 border-[#121212] mt-4 overflow-hidden">
          <div
            className={`h-full transition-all ${
              overdue ? 'bg-[#D02020]' : days < 14 && avgProgress < 70 ? 'bg-[#F0C020]' : tc.bar
            }`}
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Subtasks */}
        {project.subtasks.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
              Sub-tasks
            </h2>
            <div className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212]">
              {project.subtasks.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t-2 border-[#121212]' : ''}`}>
                  <div className="w-4 h-4 flex-shrink-0 border-2 border-[#121212]" style={{ backgroundColor: getSubtaskColor(i) }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#121212] uppercase tracking-wide">{s.name}</div>
                    <div className="mt-2 h-2 bg-[#E0E0E0] border border-[#121212] w-full overflow-hidden">
                      <div className="h-full" style={{ width: `${s.progress}%`, backgroundColor: getSubtaskColor(i) }} />
                    </div>
                  </div>
                  <div className="text-sm font-black text-[#121212] w-10 text-right">{s.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work log */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
            Work Log
          </h2>
          {project.activities.length === 0 ? (
            <div className="bg-white border-4 border-dashed border-[#121212]/30 py-10 text-center">
              <p className="text-sm font-bold text-[#121212]/40 uppercase tracking-wider">No activities logged yet</p>
            </div>
          ) : (
            <div className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212]">
              {project.activities.map((act, i) => (
                <div key={act.id} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t-2 border-[#121212]' : ''}`}>
                  <div className={`w-8 h-8 flex items-center justify-center text-xs font-black border-2 border-[#121212] flex-shrink-0 ${
                    act.user.team === 'DEV' ? 'bg-[#1040C0] text-white' : 'bg-[#D02020] text-white'
                  }`}>
                    {getInitials(act.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#121212]">{act.user.name}</span>
                      {act.subtask && <span className="text-xs text-[#121212]/40 font-medium">· {act.subtask.name}</span>}
                      {act.blocker && (
                        <span className="flex items-center gap-1 text-xs font-bold text-[#D02020] bg-[#D02020]/10 border border-[#D02020] px-1.5 py-0.5">
                          ! {act.blocker}
                        </span>
                      )}
                    </div>
                    {act.notes && <div className="text-xs text-[#121212]/50 mt-0.5 font-medium">{act.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-[#121212]">{formatHours(act.hours)}</div>
                    <div className="text-xs text-[#121212]/40 font-medium">{format(new Date(act.date), 'MMM d')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
