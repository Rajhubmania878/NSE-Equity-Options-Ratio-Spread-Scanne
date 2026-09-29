import React from 'react';
import { ArrowRight, Shield, Zap, Activity, BarChart2, CheckCircle2, Lock } from 'lucide-react';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateSignup: () => void;
  onNavigateTerms: () => void;
  onNavigatePrivacy: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  onNavigateSignup,
  onNavigateTerms,
  onNavigatePrivacy
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="font-extrabold text-base tracking-tight text-white font-mono">
            RATIO SPREAD TERMINAL
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={onNavigateLogin}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={onNavigateSignup}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>NSE & BSE Real-Time Derivatives Analytics</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Institutional Options Ratio Spread Matrix & Scanner
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          High-density options trading terminal. Instant gap analysis, automated 1:1 to 1:7 ratio matrices, live SmartAPI market feeds, and precision payoff charts.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 font-mono text-sm">
          <button
            onClick={onNavigateSignup}
            className="px-6 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/25"
          >
            <span>Launch Live Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateLogin}
            className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold hover:bg-slate-800 transition-all"
          >
            Sign In To Existing Account
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Live SmartAPI Feed</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time streaming bid/ask depth, spot cash, future basis, and straddle pricing directly from Angel One API server-side.
          </p>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Ratio Spread Matrix</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Scans 1:1, 1:2, 1:3, 2:5, 3:5, 1:4, 1:5 ratio spreads across customizable gaps, strike counts, and ATM offsets in under 2 seconds.
          </p>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Role-Based Security</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authenticated user sessions, protected market-data routes, server-verified Broker API credentials, and personal saved strategy profiles.
          </p>
        </div>
      </section>

      {/* Terminal Visual Preview Banner */}
      <section className="max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-2xl overflow-hidden font-mono text-xs text-slate-400 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-200 font-bold">TERMINAL DEMO PREVIEW · RELIANCE NSE 29-OCT-2026</span>
            <span className="text-emerald-400 text-[10px] uppercase font-bold">● LIVE MARKET FEED ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center py-2 bg-slate-950 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block">CASH</span>
              <span className="font-bold text-slate-100">₹1,498.20</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">FUTURE</span>
              <span className="font-bold text-slate-100">₹1,503.50</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">ATM STRIKE</span>
              <span className="font-bold text-amber-400">₹1,500</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">RATIO</span>
              <span className="font-bold text-emerald-400">1:3 CE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-8 px-6 text-xs text-slate-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            © 2026 Ratio Spread Terminal. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onNavigateTerms} className="hover:text-slate-300 transition-colors">
              Terms of Service
            </button>
            <button onClick={onNavigatePrivacy} className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </button>
            <button onClick={onNavigateLogin} className="hover:text-slate-300 transition-colors">
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
