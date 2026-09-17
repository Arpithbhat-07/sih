import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Building, MapPin, Landmark, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Wordmark } from '../components/common/Logo';

const DEMO_ACCOUNTS = [
  {
    role: 'MINISTRY',
    title: 'Central Directorate',
    username: 'ministry.demo',
    scope: 'National Scope · All India',
    worksCount: '5,000 Tenders',
    description: 'National overview, cross-department anomaly alerts, price deviation intelligence',
    icon: Landmark,
    accent: '#4D8CFF',
  },
  {
    role: 'STATE_AUTHORITY',
    title: 'State Authority',
    username: 'state.ka.demo',
    scope: 'Karnataka · State Scope',
    worksCount: '417 Tenders',
    description: 'State Nodal monitoring across 5 districts, local departments, and vendors',
    icon: Building,
    accent: '#F3D35E',
  },
  {
    role: 'DISTRICT_AUTHORITY',
    title: 'District Authority',
    username: 'district.mangalore.demo',
    scope: 'Bengaluru Urban · District Scope',
    worksCount: '89 Tenders',
    description: 'District monitoring, tender bidding audits, vendor concentration tracking',
    icon: MapPin,
    accent: '#52C47E',
  },
  {
    role: 'MP',
    title: 'Special Investigator',
    username: 'mp.demo',
    scope: 'Bengaluru Urban · Investigation Unit',
    worksCount: '89 Tenders',
    description: 'Autonomous vigilance investigation, bidding cartel rings, and contract overruns',
    icon: Award,
    accent: '#8B5CF6',
  },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('ministry.demo');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e, autoUser, autoPass) => {
    if (e) e.preventDefault();
    const u = autoUser || username;
    const p = autoPass || password;
    if (!u || !p) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(u, p);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc, autoSubmit = false) => {
    setUsername(acc.username);
    setPassword('demo123');
    setError('');
    if (autoSubmit) {
      handleSubmit(null, acc.username, 'demo123');
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0B] text-[#EDEDED] flex flex-col justify-between selection:bg-brand/20">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#1E2126] px-6 flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-2 text-xs font-mono text-[#737987]">
          <Shield size={14} className="text-brand" />
          PUBLIC PROCUREMENT INTELLIGENCE PLATFORM
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 bg-[#121417] border border-[#272A30] rounded-xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1A1D21] border border-[#272A30] text-[11px] font-mono text-[#A0A5B0] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                PROCUREMENT OVERSIGHT CONTROL · PORTAL 2.0
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDED] font-sans">
                PROCUREGUARD
              </h1>
              <p className="text-sm text-[#A0A5B0] mt-1.5 leading-relaxed">
                AI-Powered Public Procurement Anomaly & Investigation Intelligence Platform.
              </p>

              {/* Security Alert Banner */}
              <div className="mt-5 p-3 rounded-lg bg-[#16191E] border border-[#272A30] flex items-start gap-2.5 text-xs text-[#A0A5B0]">
                <Shield size={16} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#EDEDED]">Demonstration Authentication Layer:</span> Access is strictly role-scoped at the FastAPI backend. Select a preconfigured demo account or enter credentials.
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-risk-critical/10 border border-risk-critical/30 flex items-center gap-2 text-xs text-risk-critical">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#A0A5B0] mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737987]">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ministry.demo"
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-[#090A0B] border border-[#272A30] rounded-lg text-sm text-[#EDEDED] placeholder:text-[#5C616D] focus:outline-none focus:border-brand transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#A0A5B0] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737987]">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-[#090A0B] border border-[#272A30] rounded-lg text-sm text-[#EDEDED] placeholder:text-[#5C616D] focus:outline-none focus:border-brand transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#737987] hover:text-[#EDEDED]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-brand hover:bg-brand/90 text-[#090A0B] font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#090A0B] border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span>Sign In with Scope Verification</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1E2126] text-[11px] text-[#5C616D] flex justify-between items-center">
              <span>Standard Access Key: password is <code className="text-[#A0A5B0] font-mono">demo123</code></span>
              <span className="text-risk-low flex items-center gap-1 font-mono">
                <CheckCircle2 size={12} /> PBKDF2 SECURED
              </span>
            </div>
          </div>

          {/* Right Column: Demo Accounts Quick Select */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="text-xs font-mono uppercase tracking-wider text-[#737987] px-1">
              Select Authorized Role (1-Click Sign In)
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = username === acc.username;
                return (
                  <div
                    key={acc.role}
                    onClick={() => handleSelectDemo(acc, true)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#121417] hover:bg-[#16191E] ${
                      isSelected
                        ? 'border-brand ring-1 ring-brand/30 shadow-lg'
                        : 'border-[#272A30] hover:border-[#383C45]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${acc.accent}15`, color: acc.accent }}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#EDEDED]">{acc.title}</div>
                          <div className="text-[11px] font-mono text-[#A0A5B0]">{acc.scope}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1D21] border border-[#272A30] text-[#A0A5B0]">
                        {acc.worksCount}
                      </span>
                    </div>
                    <div className="text-xs text-[#737987] mt-2.5 line-clamp-2">
                      {acc.description}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[#1E2126] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#5C616D]">user: <strong className="text-[#EDEDED]">{acc.username}</strong></span>
                      <span className="text-brand flex items-center gap-1 group">
                        Instant Login →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="py-4 border-t border-[#1E2126] text-center text-xs text-[#5C616D] px-4 font-mono">
        Analytical signals do not constitute proof of fraud, corruption, misconduct, or wrongdoing. Final assessment requires authorized human investigation.
      </footer>
    </div>
  );
}