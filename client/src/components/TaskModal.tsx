import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User, Task } from '../types';
import { format } from 'date-fns';

interface Props {
  task?: Task;
  defaultDate?: Date;
  onClose: () => void;
  onSaved: () => void;
}

const INPUT = 'w-full bg-[#F0F0F0] border-2 border-[#121212] px-3 py-2.5 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#D02020] transition-all';
const LABEL = 'block text-xs font-black uppercase tracking-widest text-[#121212] mb-1.5';

export default function TaskModal({ task, defaultDate, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task?.title || '');
  const [dueDate, setDueDate] = useState(
    task ? format(new Date(task.dueDate), 'yyyy-MM-dd')
    : defaultDate ? format(defaultDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')
  );
  const [userId, setUserId] = useState(task?.userId || user!.id);
  const [notes, setNotes] = useState(task?.notes || '');
  const [done, setDone] = useState(task?.done || false);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canAssignOthers = user!.role === 'ADMIN' || user!.role === 'DEV';

  useEffect(() => {
    if (canAssignOthers) {
      api.get('/users').then((r) => setAssignableUsers(r.data));
    }
  }, [canAssignOthers]);

  async function handleSave() {
    if (!title.trim() || !dueDate) {
      setError('Title and due date are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (task) {
        await api.put(`/tasks/${task.id}`, { title: title.trim(), dueDate, notes: notes || null, done });
      } else {
        await api.post('/tasks', { title: title.trim(), dueDate, userId, notes: notes || null });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setSaving(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onSaved();
    } catch {
      setError('Failed to delete task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/60">
      <div className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#D02020] w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#D02020] border-b-4 border-[#121212]">
          <div>
            <div className="font-black text-lg uppercase tracking-tight text-white">
              {task ? 'Edit Task' : 'New Task'}
            </div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-wider mt-0.5">
              Reminder
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-white/40 hover:border-white text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-[#D02020] border-2 border-[#121212] text-white text-sm font-bold px-3 py-2">{error}</div>
          )}

          <div>
            <label className={LABEL}>Task title <span className="text-[#D02020]">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div>
            <label className={LABEL}>Due date <span className="text-[#D02020]">*</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={INPUT}
            />
          </div>

          {canAssignOthers && !task && (
            <div>
              <label className={LABEL}>Assign to</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={INPUT}
              >
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LABEL}>Notes <span className="text-[#121212]/30 normal-case font-medium">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={INPUT + ' resize-none'}
              placeholder="Any extra details…"
            />
          </div>

          {task && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setDone(!done)}
                className={`w-5 h-5 border-2 border-[#121212] flex items-center justify-center flex-shrink-0 transition-colors ${
                  done ? 'bg-[#1040C0]' : 'bg-white group-hover:bg-[#F0F0F0]'
                }`}
              >
                {done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-bold text-[#121212] uppercase tracking-wider">Mark as done</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t-4 border-[#121212] bg-[#F0F0F0]">
          {task && (
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
            disabled={saving}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#D02020] border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#D02020]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 transition-all"
          >
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task →'}
          </button>
        </div>
      </div>
    </div>
  );
}
