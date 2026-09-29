import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types/auth';
import { authService } from '../services/authService';
import { Shield, Search, UserX, UserCheck, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminPageProps {
  currentUser: UserProfile;
  onClose: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await authService.adminGetUsers();
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'Admin authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = !user.isActive;
    const ok = await authService.adminUpdateUserStatus(user.id, nextStatus);
    if (ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: nextStatus } : u));
    }
  };

  const handleChangeRole = async (user: UserProfile, newRole: 'ADMIN' | 'USER') => {
    const ok = await authService.adminUpdateUserRole(user.id, newRole);
    if (ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    }
  };

  const handleChangePlan = async (user: UserProfile, newPlan: 'FREE' | 'PRO') => {
    const ok = await authService.adminUpdateUserPlan(user.id, newPlan);
    if (ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, plan: newPlan } : u));
    }
  };

  const filteredUsers = users.filter(u => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.displayName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (planFilter !== 'ALL' && u.plan !== planFilter) return false;
    if (statusFilter === 'ACTIVE' && !u.isActive) return false;
    if (statusFilter === 'SUSPENDED' && u.isActive) return false;
    return true;
  });

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="bg-slate-900 border-b border-slate-800 text-slate-100 p-8 text-center space-y-3 font-mono">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">ACCESS DENIED · ADMIN ONLY</h2>
        <p className="text-xs text-slate-400">You must hold ADMIN role privileges to access the user control panel.</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs">
          Return To App
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 font-mono">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                System Admin & User Control Panel
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Manage accounts, active/suspended authorization statuses, roles, and plan tiers.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Users</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user email or name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono"
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="p-3">User & Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Loading registered accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No accounts match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{u.displayName}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                    </td>

                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={e => handleChangeRole(u, e.target.value as 'ADMIN' | 'USER')}
                        className={`px-2 py-1 rounded font-bold text-[10px] bg-slate-900 border border-slate-800 cursor-pointer ${
                          u.role === 'ADMIN' ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <select
                        value={u.plan}
                        onChange={e => handleChangePlan(u, e.target.value as 'FREE' | 'PRO')}
                        className={`px-2 py-1 rounded font-bold text-[10px] bg-slate-900 border border-slate-800 cursor-pointer ${
                          u.plan === 'PRO' ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-[10px] ${
                        u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          u.isActive
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
