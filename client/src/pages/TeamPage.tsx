import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Activity } from '../types';
import { getTeamColors, getInitials, formatHours, getWeekDays, formatDateFull } from '../lib/utils';

export default function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDays(new Date());
  const weekStart = formatDateFull(weekDays[0]);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/activities', { params: { weekStart } }),
    ]).then(([usersRes, actsRes]) => {
      setMembers(usersRes.data);
      setActivities(actsRes.data);
      setLoading(false);
    });
  }, [weekStart]);

  function getUserWeeklyHours(userId: string): number {
    return activities.filter((a) => a.userId === userId).reduce((sum, a) => sum + a.hours, 0);
  }
  function getUserBlockerCount(userId: string): number {
    return activities.filter((a) => a.userId === userId && a.blocker).length;
  }
  function getUserActiveProjects(userId: string): number {
    return new Set(activities.filter((a) => a.userId === userId && a.projectId).map((a) => a.projectId)).size;
  }

  const canViewTeam = user?.role === 'ADMIN' || user?.role === 'DEV';
  const displayedMembers = canViewTeam ? members : members.filter((m) => m.id === user?.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b-4 border-[#121212] bg-white">
        <h1 className="text-lg font-black uppercase tracking-tight text-[#121212]">Team</h1>
        <p className="text-sm text-[#121212]/50 font-medium mt-0.5">{members.length} members · Dev & Civil</p>
      </div>

      <div className="flex-1 overflow-auto p-5 bg-[#F0F0F0]">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-14 h-14 bg-[#E0E0E0]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#E0E0E0] w-3/4" />
                    <div className="h-3 bg-[#E0E0E0] w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0,1,2].map(j => <div key={j} className="h-12 bg-[#E0E0E0]" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayedMembers.map((m) => {
              const tc = getTeamColors(m.team);
              const weekHrs = getUserWeeklyHours(m.id);
              const blockers = getUserBlockerCount(m.id);
              const projects = getUserActiveProjects(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/team/${m.id}`)}
                  className="bg-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] p-5 cursor-pointer hover:-translate-y-1 transition-transform"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 flex items-center justify-center text-lg font-black border-4 border-[#121212] flex-shrink-0 ${tc.badge}`}>
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-[#121212] text-base truncate uppercase tracking-tight">{m.name}</div>
                      <div className="text-xs text-[#121212]/50 font-medium capitalize">{m.role.toLowerCase()}</div>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${tc.badge}`}>
                        {m.team}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 border-t-2 border-[#121212] pt-3">
                    <div className="text-center">
                      <div className="text-xl font-black text-[#1040C0]">{formatHours(weekHrs)}</div>
                      <div className="text-xs font-bold text-[#121212]/50 uppercase tracking-wide mt-0.5">Week</div>
                    </div>
                    <div className="text-center border-x-2 border-[#121212]">
                      <div className="text-xl font-black text-[#121212]">{projects}</div>
                      <div className="text-xs font-bold text-[#121212]/50 uppercase tracking-wide mt-0.5">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-black ${blockers > 0 ? 'text-[#D02020]' : 'text-[#121212]'}`}>
                        {blockers}
                      </div>
                      <div className="text-xs font-bold text-[#121212]/50 uppercase tracking-wide mt-0.5">Blockers</div>
                    </div>
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
