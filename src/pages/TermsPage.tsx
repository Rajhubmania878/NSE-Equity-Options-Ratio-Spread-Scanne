import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface LegalPageProps {
  onNavigateHome: () => void;
}

export const TermsPage: React.FC<LegalPageProps> = ({ onNavigateHome }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6 selection:bg-emerald-500/30">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Terminal</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs font-mono text-slate-400">Last updated: September 29, 2026</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs text-slate-300 leading-relaxed font-mono">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Ratio Spread Terminal application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">2. Market Data & Financial Disclaimer</h2>
            <p>
              The options ratio spread matrix, greeks, payoff calculations, and market quotes displayed on this platform are for informational and analytical purposes only. Nothing on this website constitutes financial or investment advice. Options trading involves substantial risk of loss.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">3. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account login credentials and for all activities conducted under your account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC<LegalPageProps> = ({ onNavigateHome }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6 selection:bg-emerald-500/30">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Terminal</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs font-mono text-slate-400">Last updated: September 29, 2026</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs text-slate-300 leading-relaxed font-mono">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">1. Information We Collect</h2>
            <p>
              We collect minimal user profile information including email address, display name, and user preferences required to authenticate your session and manage saved options ratio spread strategies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">2. Data Isolation & Security</h2>
            <p>
              Your saved configurations and account preferences are isolated to your specific user ID using server-side authorization controls. Broker API credentials remain strictly server-side and are never stored or exposed to third parties.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
