import React, { useState } from 'react';
import { authService } from '../services/authService';
import { UserProfile } from '../types/auth';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateSignup: () => void;
  onNavigateForgotPassword: () => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateSignup,
  onNavigateForgotPassword,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user } = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setError(null);

    try {
      const { user } = await authService.login(demoEmail, demoPass);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 font-mono text-sm text-slate-400 hover:text-white transition-colors mb-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Ratio Spread Terminal</span>
          </button>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Log In To Your Account
          </h1>
          <p className="text-xs text-slate-400">
            Enter your email and password to access the options trading matrix.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateForgotPassword}
                  className="text-xs font-mono text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-extrabold text-xs font-mono rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'LOG IN TO TERMINAL'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Easy Evaluation */}
          <div className="pt-4 border-t border-slate-800 space-y-2 font-mono">
            <span className="text-[10px] uppercase text-slate-500 font-bold block text-center">
              QUICK DEMO ACCESSIBLE ACCOUNTS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@ratiospread.com', 'Admin123!')}
                className="py-1.5 px-2 bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 rounded-lg text-[10px] font-bold transition-colors"
              >
                Admin User
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('pro@ratiospread.com', 'Pro123!')}
                className="py-1.5 px-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors"
              >
                Pro User
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('demo@ratiospread.com', 'User123!')}
                className="py-1.5 px-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-lg text-[10px] font-bold transition-colors"
              >
                Free User
              </button>
            </div>
          </div>
        </div>

        {/* Signup Link */}
        <div className="text-center font-mono text-xs text-slate-400">
          <span>Don't have an account? </span>
          <button onClick={onNavigateSignup} className="text-emerald-400 font-bold hover:underline">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};
