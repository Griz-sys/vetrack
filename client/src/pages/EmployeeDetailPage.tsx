import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Activity } from '../types';
import { getTeamColors, getInitials, formatHours, getWeekDays, formatDateFull } from '../lib/utils';
import { format } from 'date-fns';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDays(new Date());
  const weekStart = formatDateFull(weekDays[0]);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get('/activities', { params: { userId: id, weekStart } }),
    ]).then(([userRes, actsRes]) => {
      setMember(userRes.data);
      setActivities(actsRes.data);
      setLoading(false);
    });
  }, [id, weekStart]);

  if (loading) {
    return (
      <div className="p-5 space-y-4 bg-[#F0F0F0] h-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-white border-4 border-[#121212] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!member) return <div className="p-5 font-bold text-[#121212]/50 bg-[#F0F0F0] h-full">User not found</div>;

  const tc = getTeamColors(member.team);
  const weekHrs = activities.reduce((s, a) => s + a.hours, 0);
  const blockerCount = activities.filter((a) => a.blocker).length;
  const projectCount = new Set(activities.filter((a) => a.projectId).map((a) => a.projectId)).size;

  function getDayHours(date: Date): number {
    const ds = formatDateFull(date);
    return activities.filter((a) => formatDateFull(new Date(a.date)) === ds).reduce((s, a) => s + a.hours, 0);
  }

  const maxDayHours = Math.max(...weekDays.map((d) => getDayHours(d)), 1);
  const barColor = member.team === 'DEV' ? '#1040C0' : '#D02020';

  return (
    <div className="flex flex-col h-full overflow-auto bg-[#F0F0F0]">
      {/* Header */}
      <div className="px-5 py-4 border-b-4 border-[#121212] bg-white">
        <button
          onClick={() => navigate('/team')}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-[#121212]/50 hover:text-[#121212] mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Team
        </button>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 flex items-center justify-center text-xl font-black border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] flex-shrink-0 ${tc.badge}`}>
            {getInitials(member.name)}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#121212]">{member.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#121212]/50 font-medium capitalize">{member.role.toLowerCase()}</span>
              <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${tc.badge}`}>
                {member.team}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Hours This Week', value: formatHours(weekHrs), bg: 'bg-[#1040C0]', text: 'text-white' },
            { label: 'Active Projects', value: String(projectCount), bg: 'bg-[#F0C020]', text: 'text-[#121212]' },
            { label: 'Open Blockers', value: String(blockerCount), bg: blockerCount > 0 ? 'bg-[#D02020]' : 'bg-white', text: blockerCount > 0 ? 'text-white' : 'text-[#121212]' },
          ].map((s) => (
            <div key={s.label} className={`border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-4 text-center ${s.bg}`}>
              <div className={`text-3xl font-black ${s.text}`}>{s.value}</div>
              <div className={`text-xs font-black uppercase tracking-widest mt-1 ${s.text} opacity-70`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Week bar chart */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
            This Week
          </h2>
          <div className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-5">
            <div className="flex items-end gap-3 h-28">
              {weekDays.map((day, i) => {
                const hrs = getDayHours(day);
                const heightPct = (hrs / maxDayHours) * 100;
                const isToday = formatDateFull(day) === formatDateFull(new Date());
                return (
                  <div key={day.toISOString()} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-xs font-bold text-[#121212]/50">{hrs > 0 ? formatHours(hrs) : ''}</span>
                    <div className="w-full border-2 border-[#121212] flex items-end" style={{ height: '72px' }}>
                      <div
                        className="w-full transition-all"
                        style={{
                          height: `${Math.max(heightPct, hrs > 0 ? 6 : 0)}%`,
                          backgroundColor: isToday ? barColor : '#E0E0E0',
                        }}
                      />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide" style={{ color: isToday ? barColor : '#121212' }}>
                      {DAY_NAMES[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
            Activity Log
          </h2>
          {activities.length === 0 ? (
            <div className="bg-white border-4 border-dashed border-[#121212]/30 py-10 text-center">
              <p className="text-sm font-bold text-[#121212]/40 uppercase tracking-wider">No activities this week</p>
            </div>
          ) : (
            <div className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212]">
              {activities.map((act, i) => (
                <div key={act.id} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t-2 border-[#121212]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#121212]">
                        {act.type === 'MEETING' ? act.meetingType || 'Meeting' : act.project?.name || 'Admin'}
                      </span>
                      {act.subtask && <span className="text-xs text-[#121212]/40 font-medium">· {act.subtask.name}</span>}
                      {act.blocker && (
                        <span className="flex items-center gap-1 text-xs font-bold text-[#D02020] bg-[#D02020]/10 border border-[#D02020] px-1.5 py-0.5">
                          ! {act.blocker}
                        </span>
                      )}
                    </div>
                    {act.notes && <div className="text-xs text-[#121212]/50 font-medium mt-0.5">{act.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-[#121212]">{formatHours(act.hours)}</div>
                    <div className="text-xs text-[#121212]/40 font-medium">{format(new Date(act.date), 'EEE, MMM d')}</div>
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
