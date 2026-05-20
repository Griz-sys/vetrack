import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Project, Activity, ActivityType } from '../types';
import TimeArcPicker from './TimeArcPicker';
import { format } from 'date-fns';

interface Props {
  date: Date;
  existingActivity?: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}

const MEETING_TYPES = ['Standup', 'Planning', '1:1', 'Client meeting', 'Admin'];

const INPUT = 'w-full bg-[#F0F0F0] border-2 border-[#121212] px-3 py-2.5 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all';
const LABEL = 'block text-xs font-black uppercase tracking-widest text-[#121212] mb-1.5';

export default function LogWorkModal({ date, existingActivity, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'project' | 'meeting'>(
    existingActivity?.type === 'MEETING' || existingActivity?.type === 'ADMIN' ? 'meeting' : 'project'
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(existingActivity?.projectId || '');
  const [subtaskId, setSubtaskId] = useState(existingActivity?.subtaskId || '');
  const [hours, setHours] = useState(existingActivity?.hours || user?.defaultHrs || 8);
  const [notes, setNotes] = useState(existingActivity?.notes || '');
  const [blocker, setBlocker] = useState(existingActivity?.blocker || '');
  const [meetingType, setMeetingType] = useState(existingActivity?.meetingType || 'Standup');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects', { params: { team: user?.team, status: 'ACTIVE' } })
      .then((r) => setProjects(r.data));
  }, [user?.team]);

  const selectedProject = projects.find((p) => p.id === projectId);

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const isProjectTab = tab === 'project';
      const payload = {
        date: format(date, 'yyyy-MM-dd'),
        type: isProjectTab ? 'PROJECT' : (meetingType === 'Admin' ? 'ADMIN' : 'MEETING') as ActivityType,
        projectId: isProjectTab ? projectId || null : null,
        subtaskId: isProjectTab ? subtaskId || null : null,
        hours,
        notes: notes || null,
        blocker: isProjectTab ? blocker || null : null,
        meetingType: !isProjectTab ? meetingType : null,
      };
      if (existingActivity) {
        await api.put(`/activities/${existingActivity.id}`, payload);
      } else {
        await api.post('/activities', payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingActivity) return;
    setSaving(true);
    try {
      await api.delete(`/activities/${existingActivity.id}`);
      onSaved();
    } catch {
      setError('Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/60">
      <div className="bg-white border-2 border-[#121212] shadow-[8px_8px_0px_0px_#121212] w-full max-w-md overflow-hidden">

        {/* Header — yellow block */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#F0C020] border-b-2 border-[#121212]">
          <div>
            <div className="font-black text-lg uppercase tracking-tight text-[#121212]">
              {existingActivity ? 'Edit Entry' : 'Log Work'}
            </div>
            <div className="text-sm font-bold text-[#121212]/60">
              {format(date, 'EEEE, MMMM d')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#121212] bg-white hover:bg-[#F0F0F0] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#121212]">
          {(['project', 'meeting'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-all border-r-2 last:border-r-0 border-[#121212] ${
                tab === t
                  ? 'bg-[#121212] text-white'
                  : 'bg-white text-[#121212]/40 hover:bg-[#F0F0F0] hover:text-[#121212]'
              }`}
            >
              {t === 'project' ? 'Project' : 'Meeting'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {error && (
            <div className="bg-[#D02020] border-2 border-[#121212] text-white text-sm font-bold px-3 py-2">{error}</div>
          )}

          {tab === 'project' ? (
            <>
              <div>
                <label className={LABEL}>Project</label>
                <select
                  value={projectId}
                  onChange={(e) => { setProjectId(e.target.value); setSubtaskId(''); }}
                  className={INPUT}
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedProject && selectedProject.subtasks.length > 0 && (
                <div>
                  <label className={LABEL}>Sub-task</label>
                  <select
                    value={subtaskId}
                    onChange={(e) => setSubtaskId(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">Select sub-task…</option>
                    {selectedProject.subtasks.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={LABEL}>Hours</label>
                <TimeArcPicker value={hours} onChange={setHours} />
              </div>

              <div>
                <label className={LABEL}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={INPUT + ' resize-none'}
                  placeholder="Quick note…"
                />
              </div>

              <div>
                <label className={LABEL}>
                  Blocker <span className="text-[#121212]/30 normal-case font-medium">(optional)</span>
                </label>
                <input
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  className={INPUT}
                  placeholder="Any blockers today?"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={LABEL}>Meeting type</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className={INPUT}
                >
                  {MEETING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL}>Hours</label>
                <TimeArcPicker value={hours} onChange={setHours} />
              </div>

              <div>
                <label className={LABEL}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={INPUT + ' resize-none'}
                  placeholder="Quick note…"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t-2 border-[#121212] bg-[#F0F0F0]">
          {existingActivity && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#D02020] border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all mr-auto"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-[#121212] bg-white border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#F0F0F0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (tab === 'project' && !projectId)}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#1040C0] border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#1040C0]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 transition-all"
          >
            {saving ? 'Saving…' : existingActivity ? 'Save Changes' : 'Log It →'}
          </button>
        </div>
      </div>
    </div>
  );
}
