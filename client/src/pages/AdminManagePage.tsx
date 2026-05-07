import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { User } from '../types';
import { getTeamColors, getInitials, ALL_TEAMS } from '../lib/utils';
import UserCreateModal from '../components/UserCreateModal';

const SELECT = 'bg-[#F0F0F0] border-2 border-[#121212] px-2 py-1.5 text-xs font-bold text-[#121212] focus:outline-none focus:bg-white disabled:opacity-50 transition-all';

function teamLabel(t: string) {
  return ALL_TEAMS.find((x) => x.value === t)?.label ?? t;
}

export default function AdminManagePage() {
  const { user: self } = useAuth();
  const isDev = self?.role === 'DEV';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/users').then((r) => {
      setUsers(r.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const adminOptions = users.filter((u) => u.role === 'ADMIN');
  const regularUsers = users.filter((u) => u.role === 'USER');
  const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'DEV');

  async function changeTeam(userId: string, team: string) {
    setSavingId(userId + '_team');
    try {
      const res = await api.put(`/users/${userId}/team`, { team });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, team: res.data.team } : u)));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  async function updateAdmins(userId: string, adminIds: string[]) {
    setSavingId(userId + '_admins');
    try {
      const res = await api.put(`/users/${userId}/admins`, { adminIds });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, admins: res.data.admins } : u)));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  async function changeRole(userId: string, role: 'USER' | 'ADMIN') {
    setSavingId(userId + '_role');
    try {
      const res = await api.put(`/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: res.data.role, admins: res.data.admins } : u)));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(userId: string) {
    setSavingId(userId + '_delete');
    setConfirmDelete(null);
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  function UserRow({ u, showAdminSelect }: { u: User; showAdminSelect: boolean }) {
    const tc = getTeamColors(u.team);
    const isSaving = savingId?.startsWith(u.id) ?? false;
    const isConfirming = confirmDelete === u.id;
    const currentAdmins = u.admins ?? [];
    const availableAdmins = adminOptions.filter((a) => !currentAdmins.some((ca) => ca.id === a.id));
    const canModify = isDev && u.role !== 'DEV';

    return (
      <div className={`flex items-center gap-3 bg-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] px-4 py-3 flex-wrap transition-colors ${isConfirming ? 'border-[#D02020] shadow-[4px_4px_0px_0px_#D02020]' : ''}`}>
        {/* Avatar */}
        <div className={`w-10 h-10 flex items-center justify-center text-sm font-black border-2 border-[#121212] flex-shrink-0 ${tc.badge}`}>
          {getInitials(u.name)}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-[140px]">
          <div className="font-black text-[#121212] uppercase tracking-tight truncate">{u.name}</div>
          <div className="text-xs text-[#121212]/40 font-medium truncate">{u.email}</div>
        </div>

        {isDev ? (
          isConfirming ? (
            /* Inline delete confirmation */
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <span className="text-xs font-black uppercase tracking-wider text-[#D02020]">Delete {u.name.split(' ')[0]}?</span>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-white border-2 border-[#121212] hover:bg-[#F0F0F0] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(u.id)}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-[#D02020] text-white border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:bg-[#B01010] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Delete →
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* Department dropdown */}
              <select
                value={u.team}
                onChange={(e) => changeTeam(u.id, e.target.value)}
                disabled={isSaving}
                className={SELECT + ' min-w-[110px]'}
              >
                {ALL_TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Multi-admin assignment — only for regular users */}
              {showAdminSelect && (
                <div className="flex items-center gap-1 flex-wrap max-w-[260px]">
                  {currentAdmins.map((a) => (
                    <span
                      key={a.id}
                      className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-[#E0E8FF] border border-[#1040C0] font-bold text-[#1040C0] whitespace-nowrap"
                    >
                      {a.name.split(' ')[0]}
                      <button
                        onClick={() => updateAdmins(u.id, currentAdmins.filter((ca) => ca.id !== a.id).map((ca) => ca.id))}
                        disabled={isSaving}
                        className="ml-0.5 hover:text-[#D02020] font-black leading-none disabled:opacity-40"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {availableAdmins.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        updateAdmins(u.id, [...currentAdmins.map((a) => a.id), e.target.value]);
                      }}
                      disabled={isSaving}
                      className={SELECT + ' min-w-[80px]'}
                    >
                      <option value="">+ Add</option>
                      {availableAdmins.map((a) => (
                        <option key={a.id} value={a.id}>{a.name.split(' ')[0]}</option>
                      ))}
                    </select>
                  )}
                  {currentAdmins.length === 0 && availableAdmins.length === 0 && (
                    <span className="text-xs text-[#121212]/30 font-medium italic">no admins</span>
                  )}
                </div>
              )}

              {/* Role toggle */}
              {canModify && (
                <button
                  onClick={() => changeRole(u.id, u.role === 'USER' ? 'ADMIN' : 'USER')}
                  disabled={isSaving}
                  title={u.role === 'USER' ? 'Promote to Admin' : 'Demote to User'}
                  className={`px-2 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#121212] transition-all disabled:opacity-40 whitespace-nowrap ${
                    u.role === 'USER'
                      ? 'bg-white text-[#121212]/60 hover:bg-[#E0E8FF] hover:text-[#1040C0] hover:border-[#1040C0]'
                      : 'bg-white text-[#121212]/60 hover:bg-[#FFF0E0] hover:text-[#C05810] hover:border-[#C05810]'
                  }`}
                >
                  {u.role === 'USER' ? '↑ Admin' : '↓ User'}
                </button>
              )}

              {/* Delete */}
              {canModify && (
                <button
                  onClick={() => setConfirmDelete(u.id)}
                  disabled={isSaving}
                  title="Delete user"
                  className="p-1.5 border-2 border-[#121212] bg-white hover:bg-[#D02020] hover:text-white hover:border-[#D02020] text-[#121212]/40 transition-all disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              {isSaving ? (
                <svg className="w-4 h-4 animate-spin text-[#1040C0] flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#107050] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <span className={`text-xs px-2 py-0.5 font-black uppercase tracking-wider border border-[#121212] ${tc.badge}`}>
              {teamLabel(u.team)}
            </span>
            <span className="text-xs font-bold text-[#121212]/40 uppercase tracking-wide">
              {(u.admins ?? []).length > 0
                ? (u.admins ?? []).map((a) => `↳ ${a.name.split(' ')[0]}`).join(' · ')
                : 'Unassigned'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b-4 border-[#121212] bg-white">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-[#121212]">User Management</h1>
          <p className="text-sm text-[#121212]/50 font-medium mt-0.5">
            {isDev ? 'Change department · assign admins · create accounts' : 'Add members to your team'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1040C0] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] text-sm font-black uppercase tracking-wider hover:bg-[#1040C0]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {isDev ? 'New Account' : 'Add Member'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 bg-[#F0F0F0] space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white border-4 border-[#121212] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Admins & Dev — DEV only */}
            {isDev && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
                  Admins & Superuser
                </h2>
                <div className="space-y-2">
                  {admins.map((u) => (
                    <UserRow key={u.id} u={u} showAdminSelect={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#121212] border-b-4 border-[#121212] pb-2 mb-3">
                {isDev ? 'Users' : 'Your Team Members'}
              </h2>
              {regularUsers.length === 0 ? (
                <div
                  onClick={() => setShowCreate(true)}
                  className="bg-white border-4 border-dashed border-[#121212]/30 py-10 text-center cursor-pointer hover:border-[#1040C0]/50 hover:bg-[#F0F8FF] transition-colors"
                >
                  <div className="flex justify-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-[#1040C0] border-2 border-[#121212]" />
                    <div className="w-5 h-5 rounded-full bg-[#D02020] border-2 border-[#121212]" />
                    <div className="w-5 h-5 bg-[#F0C020] border-2 border-[#121212] rotate-45" />
                  </div>
                  <p className="text-sm font-bold text-[#121212]/40 uppercase tracking-wider">No users yet</p>
                  <p className="text-xs font-bold text-[#1040C0] uppercase tracking-wider mt-1">+ Add first member →</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {regularUsers.map((u) => (
                    <UserRow key={u.id} u={u} showAdminSelect={isDev} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <UserCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
