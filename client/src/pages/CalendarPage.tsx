import { useState, useEffect, useCallback } from 'react';
import { addWeeks, subWeeks, format, isWeekend } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Activity, Task, Team } from '../types';
import { getWeekDays, formatDateFull, getActivityChipColor, getProjectColor, formatHours, getInitials, ALL_TEAMS, getTeamColors } from '../lib/utils';
import LogWorkModal from '../components/LogWorkModal';
import TaskModal from '../components/TaskModal';

export default function CalendarPage() {
  const { user } = useAuth();
  const isUser = user?.role === 'USER';
  const [team, setTeam] = useState<Team>(user?.team || 'DEV');
  const [weekBase, setWeekBase] = useState(new Date());
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modal, setModal] = useState<{ date: Date; userId: string; existing?: Activity } | null>(null);
  const [taskModal, setTaskModal] = useState<{ task?: Task; defaultDate?: Date } | null>(null);
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDays(weekBase);
  const weekStart = formatDateFull(weekDays[0]);
  const canSeeTeam = user?.role === 'DEV';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let usersPromise;
      if (user!.role === 'DEV') {
        usersPromise = api.get('/users', { params: { team } });
      } else if (user!.role === 'ADMIN') {
        usersPromise = api.get('/users');
      } else {
        usersPromise = api.get(`/users/${user!.id}`).then((r) => ({ data: [r.data] }));
      }

      const teamParam = user!.role === 'DEV' ? team : undefined;
      const [usersRes, activitiesRes, tasksRes] = await Promise.all([
        usersPromise,
        api.get('/activities', { params: { weekStart, ...(teamParam && { team: teamParam }) } }),
        api.get('/tasks', { params: { weekStart } }),
      ]);
      setUsers(usersRes.data);
      setActivities(activitiesRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [team, weekStart, user]);

  useEffect(() => { load(); }, [load]);

  function getCellActivities(userId: string, date: Date): Activity[] {
    const dateStr = formatDateFull(date);
    return activities.filter(
      (a) => a.userId === userId && formatDateFull(new Date(a.date)) === dateStr
    );
  }

  function getCellTasks(userId: string, date: Date): Task[] {
    const dateStr = formatDateFull(date);
    return tasks.filter(
      (t) => t.userId === userId && formatDateFull(new Date(t.dueDate)) === dateStr
    );
  }

  function getDayHours(userId: string, date: Date): number {
    return getCellActivities(userId, date).reduce((sum, a) => sum + a.hours, 0);
  }

  const weekNavBar = (
    <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#121212] bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black uppercase tracking-tight text-[#121212]">
          {isUser ? 'My Week' : 'Team Calendar'}
        </h1>
        {canSeeTeam && (
          <div className="flex border-2 border-[#121212]">
            {ALL_TEAMS.map((t) => {
              const active = team === t.value;
              const tc = getTeamColors(t.value as Team);
              return (
                <button
                  key={t.value}
                  onClick={() => setTeam(t.value as Team)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all border-r-2 border-[#121212] last:border-r-0 ${
                    active ? `${tc.badge} border-[#121212]` : 'bg-white text-[#121212]/50 hover:bg-[#F0F0F0]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {(user?.role === 'ADMIN' || user?.role === 'USER') && (
          <button
            onClick={() => setTaskModal({})}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#D02020] text-white border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] text-xs font-black uppercase tracking-wider hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Task
          </button>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekBase((d) => subWeeks(d, 1))} className="p-2 border-2 border-[#121212] bg-white hover:bg-[#F0F0F0] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-[#121212] min-w-[160px] text-center px-2">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekBase((d) => addWeeks(d, 1))} className="p-2 border-2 border-[#121212] bg-white hover:bg-[#F0F0F0] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setWeekBase(new Date())}
            className="ml-1 px-3 py-2 bg-[#F5C400] text-[#121212] border-2 border-[#121212] text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212] hover:bg-[#F5C400]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );

  // ── USER PERSONAL VIEW ─────────────────────────────────────────────────────
  if (isUser) {
    const myId = user!.id;
    const todayStr = formatDateFull(new Date());
    const weekTotal = weekDays.reduce((sum, d) => sum + getDayHours(myId, d), 0);
    const taskCount = tasks.filter((t) => t.userId === myId && !t.done).length;

    return (
      <div className="flex flex-col h-full">
        {weekNavBar}

        {/* Week summary strip */}
        <div className="flex items-center gap-6 px-5 py-2.5 bg-white border-b-2 border-[#121212] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#121212]/40">Week total</span>
            <span className="text-sm font-black text-[#1040C0]">{formatHours(weekTotal)}</span>
          </div>
          {taskCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#121212]/40">Open tasks</span>
              <span className="text-sm font-black text-[#D02020]">{taskCount}</span>
            </div>
          )}
        </div>

        {/* 7-day personal grid */}
        <div className="flex-1 overflow-auto bg-[#F0F0F0] p-4">
          {loading ? (
            <div className="grid grid-cols-7 gap-3 h-full">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] animate-pulse min-h-[200px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3 min-h-full" style={{ minWidth: '700px' }}>
              {weekDays.map((day) => {
                const dateStr = formatDateFull(day);
                const isToday = dateStr === todayStr;
                const weekend = isWeekend(day);
                const dayActs = getCellActivities(myId, day);
                const dayTasks = getCellTasks(myId, day);
                const totalHrs = getDayHours(myId, day);
                const hasContent = dayActs.length > 0 || dayTasks.length > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`flex flex-col border-2 border-[#121212] cursor-pointer transition-transform hover:-translate-y-0.5 ${
                      isToday
                        ? 'shadow-[6px_6px_0px_0px_#1040C0]'
                        : weekend
                        ? 'shadow-[4px_4px_0px_0px_#E0E0E0]'
                        : 'shadow-[4px_4px_0px_0px_#121212]'
                    } ${weekend ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                    onClick={() => setModal({
                      date: day,
                      userId: myId,
                      existing: dayActs.length === 1 ? dayActs[0] : undefined,
                    })}
                  >
                    {/* Day header */}
                    <div className={`px-3 py-2 border-b-2 border-[#121212] ${
                      isToday
                        ? 'bg-[#1040C0] text-white'
                        : weekend
                        ? 'bg-[#E0E0E0] text-[#121212]'
                        : 'bg-[#FFF9E0] text-[#121212]'
                    }`}>
                      <div className="text-xs font-black uppercase tracking-widest opacity-70">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-2xl font-black leading-none mt-0.5">
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-2 space-y-1 min-h-[120px]">
                      {!hasContent && (
                        <div className="h-full flex items-center justify-center min-h-[80px]">
                          <svg className="w-5 h-5 text-[#121212]/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      )}
                      {dayActs.map((act) => (
                        <div
                          key={act.id}
                          className={`px-1.5 py-1 text-xs truncate flex items-center gap-1 border border-[#121212]/20 ${getActivityChipColor(act.type)}`}
                          style={act.type === 'PROJECT' && act.projectId ? { backgroundColor: getProjectColor(act.projectId) } : undefined}
                        >
                          {act.blocker && <span className="text-[#D02020] flex-shrink-0">!</span>}
                          <span className="truncate flex-1">
                            {act.type === 'MEETING' ? act.meetingType || 'Meeting' : act.project?.name || 'Admin'}
                          </span>
                          <span className="flex-shrink-0 opacity-70 ml-auto">{formatHours(act.hours)}</span>
                        </div>
                      ))}
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); setTaskModal({ task }); }}
                          className={`px-1.5 py-1 text-xs truncate flex items-center gap-1 border-2 border-[#121212] cursor-pointer transition-opacity ${
                            task.done ? 'bg-[#E0E0E0] text-[#121212]/40 line-through' : 'bg-[#D02020] text-white hover:bg-[#D02020]/90'
                          }`}
                        >
                          <span className="flex-shrink-0 text-[10px]">★</span>
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    {totalHrs > 0 && (
                      <div className={`px-3 py-1.5 border-t-2 border-[#121212] text-right ${
                        isToday ? 'bg-[#1040C0]/10' : weekend ? 'bg-[#E0E0E0]/40' : 'bg-[#FFF9E0]'
                      }`}>
                        <span className="text-xs font-black text-[#121212]/60">{formatHours(totalHrs)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {modal && (
          <LogWorkModal
            date={modal.date}
            existingActivity={modal.existing}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
          />
        )}
        {taskModal !== null && (
          <TaskModal
            task={taskModal.task}
            defaultDate={taskModal.defaultDate}
            onClose={() => setTaskModal(null)}
            onSaved={() => { setTaskModal(null); load(); }}
          />
        )}
      </div>
    );
  }

  // ── ADMIN / DEV TEAM TABLE VIEW ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {weekNavBar}

      <div className="flex-1 overflow-auto scrollbar-thin bg-[#F0F0F0]">
        <table className="w-full border-collapse" style={{ minWidth: '860px' }}>
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-xs font-black text-[#121212] uppercase tracking-widest w-40 border-b-2 border-r-2 border-[#121212] sticky left-0 bg-[#FFF9E0] z-10">
                Member
              </th>
              {weekDays.map((day) => {
                const isToday = formatDateFull(day) === formatDateFull(new Date());
                const weekend = isWeekend(day);
                return (
                  <th
                    key={day.toISOString()}
                    className={`text-center px-2 py-3 text-xs font-black uppercase tracking-widest border-b-2 border-r-2 border-[#121212] last:border-r-0 ${
                      isToday ? 'bg-[#1040C0] text-white'
                      : weekend ? 'bg-[#E0E0E0] text-[#121212]/60'
                      : 'bg-[#FFF9E0] text-[#121212]'
                    }`}
                  >
                    <div className="opacity-70">{format(day, 'EEE')}</div>
                    <div className="text-base mt-0.5 font-black">{format(day, 'd')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b-2 border-[#121212]">
                    <td className="px-4 py-3 sticky left-0 bg-white border-r-2 border-[#121212]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#E0E0E0] animate-pulse" />
                        <div className="w-20 h-4 bg-[#E0E0E0] rounded animate-pulse" />
                      </div>
                    </td>
                    {weekDays.map((d) => (
                      <td key={d.toISOString()} className="px-2 py-3 border-r-2 border-[#121212] last:border-r-0">
                        <div className="h-12 bg-[#E0E0E0] animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u) => (
                  <tr key={u.id} className="border-b-2 border-[#121212] hover:bg-white/60 group">
                    <td className="px-4 py-3 sticky left-0 bg-white border-r-2 border-[#121212] group-hover:bg-white transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 flex items-center justify-center text-xs font-black border-2 border-[#121212] flex-shrink-0 ${
                          getTeamColors(u.team).badge
                        }`}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#121212] leading-tight">{u.name}</div>
                          <div className="text-xs text-[#121212]/40 font-medium capitalize">{u.role.toLowerCase()}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const cellActs = getCellActivities(u.id, day);
                      const cellTasks = getCellTasks(u.id, day);
                      const totalHrs = getDayHours(u.id, day);
                      const isOwnRow = u.id === user?.id;
                      const hasContent = cellActs.length > 0 || cellTasks.length > 0;
                      const weekend = isWeekend(day);
                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-1.5 py-1.5 align-top border-r-2 border-[#121212] last:border-r-0 ${
                            isOwnRow ? 'cursor-pointer' : ''
                          } ${weekend ? 'bg-[#F8F8F8]' : ''}`}
                          onClick={() => isOwnRow && setModal({
                            date: day,
                            userId: u.id,
                            existing: cellActs.length === 1 ? cellActs[0] : undefined,
                          })}
                        >
                          <div className={`min-h-[52px] p-1 transition-colors ${
                            !hasContent && isOwnRow
                              ? 'border-2 border-dashed border-[#121212]/20 hover:border-[#121212]/50 hover:bg-white'
                              : isOwnRow ? 'hover:bg-white/80' : ''
                          }`}>
                            {!hasContent && isOwnRow && (
                              <div className="w-full h-full flex items-center justify-center min-h-[40px]">
                                <svg className="w-4 h-4 text-[#121212]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            )}
                            {cellActs.map((act) => (
                              <div
                                key={act.id}
                                className={`px-1.5 py-0.5 text-xs mb-0.5 truncate flex items-center gap-1 border border-[#121212]/20 ${getActivityChipColor(act.type)}`}
                                style={act.type === 'PROJECT' && act.projectId ? { backgroundColor: getProjectColor(act.projectId) } : undefined}
                              >
                                {act.blocker && <span className="text-[#D02020]">!</span>}
                                <span className="truncate">
                                  {act.type === 'MEETING' ? act.meetingType || 'Meeting' : act.project?.name || 'Admin'}
                                </span>
                                <span className="ml-auto flex-shrink-0 opacity-60">{formatHours(act.hours)}</span>
                              </div>
                            ))}
                            {cellTasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={(e) => { e.stopPropagation(); setTaskModal({ task }); }}
                                className={`px-1.5 py-0.5 text-xs mb-0.5 truncate flex items-center gap-1 border-2 border-[#121212] cursor-pointer transition-opacity ${
                                  task.done ? 'bg-[#E0E0E0] text-[#121212]/40 line-through' : 'bg-[#D02020] text-white hover:bg-[#D02020]/90'
                                }`}
                              >
                                <span className="flex-shrink-0 text-[10px]">★</span>
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {totalHrs > 0 && (
                              <div className="text-xs text-[#121212]/40 text-right mt-0.5 font-medium">
                                {formatHours(totalHrs)}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <LogWorkModal
          date={modal.date}
          existingActivity={modal.existing}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
      {taskModal !== null && (
        <TaskModal
          task={taskModal.task}
          defaultDate={taskModal.defaultDate}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); load(); }}
        />
      )}
    </div>
  );
}
