
import React, { useState } from 'react';
import { User, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

const BRAND_LOGO_URL = "/logo.png";
const BRAND_LOGO_FALLBACK_URL = "https://raw.githubusercontent.com/ai-gen-images/assets/main/logo_badiiy.png";

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-800 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 bg-white rounded-2xl p-2 border-2 border-indigo-200 ring-4 ring-indigo-500/15 shadow-lg">
            <img 
              src={BRAND_LOGO_URL}
              alt="Logo" 
              className="w-28 h-28 object-contain" 
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === "true") {
                  img.style.display = 'none';
                  return;
                }
                img.dataset.fallbackApplied = "true";
                img.src = BRAND_LOGO_FALLBACK_URL;
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Tizimga kirish</h1>
          <p className="text-gray-500 mt-2 text-center">Qayta tayyorlash va malaka oshirish kurslari tinglovchilarining test platformasi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Foydalanuvchi nomi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="Login"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Parol</label>
            <input
              type="password"
              required
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98]"
          >
            {loading ? 'KIRILMOQDA...' : 'TIZIMGA KIRISH'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
          O‘zBA huzuridagi Markaz @ 2026
        </div>
      </div>
    </div>
  );
};

export default Login;
