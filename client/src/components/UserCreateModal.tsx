import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Team } from '../types';
import { ALL_TEAMS } from '../lib/utils';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const INPUT = 'w-full bg-[#F0F0F0] border-2 border-[#121212] px-3 py-2.5 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all';
const LABEL = 'block text-xs font-black uppercase tracking-widest text-[#121212] mb-1.5';

export default function UserCreateModal({ onClose, onCreated }: Props) {
  const { user: self } = useAuth();
  const isDev = self?.role === 'DEV';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [team, setTeam] = useState<Team>(self?.team || 'DEV');
  const [defaultHrs, setDefaultHrs] = useState(8);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email and password are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/users', { name: name.trim(), email: email.trim(), password, role, team, defaultHrs });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/60">
      <div className="bg-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#1040C0] w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1040C0] border-b-4 border-[#121212]">
          <div>
            <div className="font-black text-lg uppercase tracking-tight text-white">New Account</div>
            <div className="text-xs font-bold text-white/60 uppercase tracking-wider mt-0.5">
              {isDev ? 'User or Admin' : 'Add team member'}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 border-2 border-white/40 hover:border-white text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-[#D02020] border-2 border-[#121212] text-white text-sm font-bold px-3 py-2">{error}</div>
          )}

          {/* Role — only DEV can pick ADMIN */}
          {isDev && (
            <div>
              <label className={LABEL}>Account type</label>
              <div className="flex border-2 border-[#121212]">
                {(['USER', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                      role === r ? 'bg-[#121212] text-white' : 'bg-white text-[#121212]/50 hover:bg-[#F0F0F0]'
                    }`}
                  >
                    {r === 'USER' ? 'User' : 'Admin'}
                  </button>
                ))}
              </div>
              {role === 'ADMIN' && (
                <p className="text-xs text-[#121212]/40 font-medium mt-1.5">
                  Admins manage a group of users and create projects.
                </p>
              )}
            </div>
          )}

          {/* Team */}
          <div>
            <label className={LABEL}>Department</label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as Team)}
              className={INPUT}
            >
              {ALL_TEAMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className={LABEL}>Full name <span className="text-[#D02020]">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              placeholder="e.g. Jane Smith"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className={LABEL}>Email <span className="text-[#D02020]">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
              placeholder="jane@company.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className={LABEL}>Password <span className="text-[#D02020]">*</span></label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT + ' pr-10'}
                placeholder="Temporary password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#121212]/40 hover:text-[#121212] transition-colors"
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Default hours */}
          <div>
            <label className={LABEL}>Default hours/day</label>
            <input
              type="number"
              min={1}
              max={24}
              value={defaultHrs}
              onChange={(e) => setDefaultHrs(Number(e.target.value))}
              className={INPUT}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t-4 border-[#121212] bg-[#F0F0F0]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-[#121212] bg-white border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#F0F0F0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#1040C0] border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#1040C0]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 transition-all"
          >
            {saving ? 'Creating…' : 'Create Account →'}
          </button>
        </div>
      </div>
    </div>
  );
}
