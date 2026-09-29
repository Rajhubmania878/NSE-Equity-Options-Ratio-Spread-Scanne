import React, { useState, useEffect } from 'react';
import { UserProfile, UserSavedStrategy } from '../types/auth';
import { authService } from '../services/authService';
import { User, Shield, Key, LogOut, Bookmark, Trash2, Check, AlertCircle } from 'lucide-react';

interface SettingsPageProps {
  user: UserProfile;
  onLogout: () => void;
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onLogout,
  onClose
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordError] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [savedStrategies, setSavedStrategies] = useState<UserSavedStrategy[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService.getSavedStrategies().then(list => {
      if (mounted) {
        setSavedStrategies(list);
        setIsLoadingStrategies(false);
      }
    }).catch(() => {
      if (mounted) setIsLoadingStrategies(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setIsChangingPass(true);
    setPasswordMsg(null);
    setPasswordError(null);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    const ok = await authService.deleteSavedStrategy(id);
    if (ok) {
      setSavedStrategies(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Account & Security Settings
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Manage your personal preferences, security, and saved ratio configurations.
            </p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-mono text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: User Profile & Plan */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-400" />
              <span>User Profile</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Email Address</span>
                <span className="text-slate-100 font-bold text-sm">{user.email}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Display Name</span>
                <span className="text-slate-200 font-semibold">{user.displayName}</span>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Role</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    user.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Plan</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    user.plan === 'PRO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {user.plan} PLAN
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Security & Password Change */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Security & Password</span>
            </div>

            {passwordMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg font-mono flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{passwordMsg}</span>
              </div>
            )}

            {passwordErr && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordErr}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Section 3: User Isolated Saved Strategies */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <span>Your Saved Ratio Strategies ({savedStrategies.length})</span>
            </div>
            <span className="text-[11px] text-slate-500">Row-Level Security Protected</span>
          </div>

          {isLoadingStrategies ? (
            <div className="text-xs font-mono text-slate-500 py-4 text-center">Loading saved strategies...</div>
          ) : savedStrategies.length === 0 ? (
            <div className="text-xs font-mono text-slate-500 py-4 text-center">No saved strategy configurations yet. Click "Save" in the control bar to preserve your ratio setups.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs pt-2">
              {savedStrategies.map(st => (
                <div key={st.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-100 block">{st.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {st.exchange} · {st.underlying} · Gap ₹{st.gap} (CNT {st.cnt})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteStrategy(st.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete strategy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
