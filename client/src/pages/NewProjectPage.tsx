import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Team } from '../types';
import { getSubtaskColor, ALL_TEAMS } from '../lib/utils';

interface SubtaskRow {
  id: string;
  name: string;
  assignedTo: string;
}

const INPUT = 'w-full bg-[#F0F0F0] border-2 border-[#121212] px-3 py-2.5 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all';
const LABEL = 'block text-xs font-black uppercase tracking-widest text-[#121212] mb-1.5';

export default function NewProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team>(user?.team || 'DEV');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([
    { id: crypto.randomUUID(), name: '', assignedTo: '' },
  ]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users', { params: { team } }).then((r) => setTeamMembers(r.data));
  }, [team]);

  function addSubtask() {
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), name: '', assignedTo: '' }]);
  }
  function updateSubtask(id: string, field: keyof SubtaskRow, value: string) {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }
  function removeSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSubmit() {
    if (!name || !startDate || !deadline) {
      setError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name, team, startDate, deadline,
        subtasks: subtasks
          .filter((s) => s.name.trim())
          .map((s) => ({ name: s.name.trim(), assignedTo: s.assignedTo || null })),
      };
      const res = await api.post('/projects', payload);
      navigate(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

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
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#121212]">New Project</h1>
      </div>

      <div className="flex-1 p-5 max-w-2xl">
        {error && (
          <div className="bg-[#D02020] border-2 border-[#121212] text-white text-sm font-bold px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Team toggle */}
        <div className="mb-6">
          <label className={LABEL}>Team</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as Team)}
            className="bg-[#F0F0F0] border-2 border-[#121212] px-4 py-2.5 text-sm font-bold text-[#121212] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all"
          >
            {ALL_TEAMS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Basic fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className={LABEL}>
              Project name <span className="text-[#D02020]">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              placeholder="e.g. API Platform v3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Start date <span className="text-[#D02020]">*</span></label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Deadline <span className="text-[#D02020]">*</span></label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>

        {/* Subtasks builder */}
        <div className="mb-8">
          <label className={LABEL}>Sub-tasks</label>
          <div className="space-y-2">
            {subtasks.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="w-4 h-4 flex-shrink-0 border-2 border-[#121212]" style={{ backgroundColor: getSubtaskColor(i) }} />
                <input
                  value={s.name}
                  onChange={(e) => updateSubtask(s.id, 'name', e.target.value)}
                  className={INPUT + ' flex-1'}
                  placeholder={`Sub-task ${i + 1}…`}
                />
                <select
                  value={s.assignedTo}
                  onChange={(e) => updateSubtask(s.id, 'assignedTo', e.target.value)}
                  className="w-32 bg-[#F0F0F0] border-2 border-[#121212] px-2 py-2.5 text-sm font-medium text-[#121212] focus:outline-none focus:bg-white transition-all"
                >
                  <option value="">Assign…</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubtask(s.id)}
                    className="p-1.5 border-2 border-transparent hover:border-[#D02020] hover:bg-[#D02020]/10 text-[#121212]/30 hover:text-[#D02020] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSubtask}
            className="mt-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1040C0] hover:text-[#1040C0]/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Sub-task
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="px-5 py-2.5 text-sm font-black uppercase tracking-wider text-[#121212] bg-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#F0F0F0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white bg-[#D02020] border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all"
          >
            {saving ? 'Creating…' : 'Create Project →'}
          </button>
        </div>
      </div>
    </div>
  );
}
