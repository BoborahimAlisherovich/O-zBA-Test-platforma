import React, { useState } from 'react';
import { SiteSettings } from '../types';
import { LockKeyhole, User } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  branding?: SiteSettings;
}

const BRAND_LOGO_URL = "/logo.png";
const BRAND_LOGO_FALLBACK_URL = "https://raw.githubusercontent.com/ai-gen-images/assets/main/logo_badiiy.png";
const LOGIN_BG_IMAGE = "https://idum.uz/wp-content/uploads/2022/10/tasaviriy_sanat_600.jpg";

const Login: React.FC<LoginProps> = ({ onLogin, branding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginLogoSrc = branding?.loginLogo || BRAND_LOGO_URL;
  const siteTitle = branding?.siteTitle || "O'ZBA MARKAZ";
  const siteSubtitle = branding?.siteSubtitle || "Test platformasi";
  const showLogoImage = Boolean(branding?.loginLogo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.message || 'Login yoki parol xato!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1d2d3c] px-4 py-6 sm:px-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${LOGIN_BG_IMAGE}")` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(52,123,172,0.48),rgba(42,108,162,0.42),rgba(13,31,46,0.82))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(220,244,255,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.12),transparent_28%)]" />
      <div className="absolute inset-0 backdrop-blur-[3px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-[30rem] rounded-[2.25rem] border border-white/20 bg-[linear-gradient(180deg,rgba(20,42,59,0.84),rgba(22,48,68,0.84),rgba(31,61,79,0.8))] px-10 py-10 shadow-[0_28px_90px_rgba(10,26,38,0.34)] backdrop-blur-xl sm:px-12">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
              {showLogoImage ? (
                <img
                  src={loginLogoSrc}
                  alt="Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === 'true') {
                      img.style.display = 'none';
                      return;
                    }
                    img.dataset.fallbackApplied = 'true';
                    img.src = BRAND_LOGO_FALLBACK_URL;
                  }}
                />
              ) : (
                <div className="h-full w-full rounded-full bg-white" />
              )}
            </div>

            <h1 className="text-center text-[2.2rem] font-black uppercase tracking-[-0.03em] text-white sm:text-[2.35rem]">
              {siteTitle}
            </h1>
            <p className="mt-3 text-center text-[1.05rem] font-semibold text-white/85">
              {siteSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-3 block text-base font-black uppercase tracking-[0.2em] text-white/90">
                Foydalanuvchi nomi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-emerald-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  required
                  className="block h-14 w-full rounded-[1.15rem] border border-white/70 bg-white pl-12 pr-4 text-xl font-semibold text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/80"
                  placeholder="Login"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-3 block text-base font-black uppercase tracking-[0.2em] text-white/90">
                Parol
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-emerald-500">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  className="block h-14 w-full rounded-[1.15rem] border border-white/70 bg-white pl-12 pr-4 text-xl font-semibold text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/80"
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-5 text-base font-bold leading-relaxed text-rose-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[1.15rem] bg-gradient-to-r from-[#1bc48a] to-[#1095da] py-4 text-xl font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_35px_rgba(14,165,164,0.28)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'KIRILMOQDA...' : 'TIZIMGA KIRISH'}
            </button>
          </form>

          <div className="mt-8 border-t border-white/20 pt-8 text-center text-xl font-semibold text-white/80">
            O'zBA huzuridagi Markaz @ 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
