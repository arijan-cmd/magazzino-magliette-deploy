import React from 'react';
import { ShieldCheck, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { formatDate, ROLE_LABELS } from '../constants';
import { AppUser, UserRole } from '../types';

interface UsersSettingsProps {
  users: AppUser[];
  currentUserId: string;
  onUpdateRole: (uid: string, role: UserRole) => void;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function UsersSettings({ users, currentUserId, onUpdateRole }: UsersSettingsProps) {
  const sorted = [...users].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <UsersIcon size={19} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gestione utenti</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{users.length} account registrati</p>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-softer">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-800/40">
            <tr>
              <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                Utente
              </th>
              <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                Registrato il
              </th>
              <th className="text-left px-4 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                Ruolo
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr
                key={u.uid}
                className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                      {getInitials(u.displayName) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{u.displayName}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-medium truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.uid === currentUserId ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                      {ROLE_LABELS[u.role]} (tu)
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => onUpdateRole(u.uid, e.target.value as UserRole)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/40"
                    >
                      <option value="venditore">Venditore</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                  Nessun utente registrato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
