
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { SiteSettings, User, UserRole } from './types';
import { authStorage, getMe, getSiteSettings, getSnapshot, login } from './api';
import Login from './views/Login';
import { LogOut, Shield, GraduationCap, Activity, LayoutDashboard, BarChart3, Menu, X } from 'lucide-react';

const AdminDashboard = lazy(() => import('./views/AdminDashboard'));
const ParticipantDashboard = lazy(() => import('./views/ParticipantDashboard'));
const ManagerDashboard = lazy(() => import('./views/ManagerDashboard'));

const BRAND_LOGO_URL = "/logo.png";
const BRAND_LOGO_FALLBACK_URL = "https://raw.githubusercontent.com/ai-gen-images/assets/main/logo_badiiy.png";
const SITE_SETTINGS_CACHE_KEY = 'artedu_site_settings_cache';
const getCachedSiteSettings = () => {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const persistSiteSettings = (siteSettings: any) => {
  try {
    localStorage.setItem(SITE_SETTINGS_CACHE_KEY, JSON.stringify(siteSettings || {}));
  } catch {}
};
const getInitialSiteSettings = () => getCachedSiteSettings() || {
  loginLogo: '',
  sidebarLogo: '',
  siteTitle: '',
  siteSubtitle: '',
  demoMaxAttempts: 5,
};

const EMPTY_DATA = {
  users: [],
  groups: [],
  subjects: [],
  modules: [],
  questions: [],
  results: [],
  demoSubjects: [],
  demoModules: [],
  demoQuestions: [],
  demoResults: [],
  siteSettings: getInitialSiteSettings(),
};

const SidebarLink: React.FC<{ to: string, icon: any, label: string, active?: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
        : 'text-gray-400 hover:bg-[#333333] hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5" /> {label}
  </Link>
);

const AppContent: React.FC<{ user: User, data: any, updateData: (d: any) => Promise<void>, reloadData: () => Promise<void>, onLogout: () => void }> = ({ user, data, updateData, reloadData, onLogout }) => {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  const isMainAdminTab = !currentTab || ['subjects', 'tests', 'groups', 'users', 'site-settings'].includes(currentTab);
  const isDemoAdminTab = ['demo-subjects', 'demo-tests'].includes(currentTab || '');
  const branding: SiteSettings = data.siteSettings || {};
  const sidebarLogoSrc = branding.sidebarLogo || BRAND_LOGO_URL;
  const siteTitle = branding.siteTitle || 'ART EDU';
  const siteSubtitle = branding.siteSubtitle || 'Test Platform';

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Menyuni yopish"
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#1a1a1a] text-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-7 border-b border-[#333333] flex items-center gap-4 bg-gradient-to-r from-[#171717] to-[#1e1e1e]">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-white shadow-inner border-2 border-indigo-200 ring-2 ring-indigo-500/20 flex items-center justify-center">
            <img 
              src={sidebarLogoSrc}
              alt="Logo" 
              className="h-full w-full scale-[0.9] object-contain" 
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === "true") {
                  img.src = 'https://via.placeholder.com/40?text=A';
                  return;
                }
                img.dataset.fallbackApplied = "true";
                img.src = BRAND_LOGO_FALLBACK_URL;
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">{siteTitle}</h1>
            <p className="text-[10px] font-black text-indigo-500 tracking-widest uppercase mt-1">{siteSubtitle}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <div className="px-3 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Asosiy Menyular</div>

          {user.role === UserRole.ADMIN && (
            <>
              <SidebarLink 
                to="/admin?tab=subjects" 
                icon={LayoutDashboard} 
                label="Boshqaruv Paneli" 
                active={location.pathname === '/admin' && isMainAdminTab} 
              />
              <SidebarLink 
                to="/admin?tab=demo-subjects" 
                icon={Shield} 
                label="Demo Testlar" 
                active={location.pathname === '/admin' && isDemoAdminTab} 
              />
              <SidebarLink 
                to="/admin?tab=monitoring" 
                icon={Activity} 
                label="Monitoring" 
                active={currentTab === 'monitoring'} 
              />
              <SidebarLink 
                to="/admin?tab=results" 
                icon={BarChart3} 
                label="Natijalar" 
                active={currentTab === 'results'} 
              />
            </>
          )}

          {user.role === UserRole.PARTICIPANT && (
            <SidebarLink 
              to="/participant" 
              icon={GraduationCap} 
              label="Mening Testlarim" 
              active={location.pathname === '/participant'} 
            />
          )}

          {user.role === UserRole.MANAGER && (
            <SidebarLink
              to="/manager"
              icon={BarChart3}
              label="Menejer Paneli"
              active={location.pathname === '/manager'}
            />
          )}

          <div className="mt-6 border-t border-[#333333] pt-6">
            <div className="flex items-center gap-4 p-4 mb-4 bg-[#222222] rounded-2xl border border-[#333333]">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg">
                {user.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black truncate">{user.fullName}</p>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.16),rgba(38,12,12,0.12))] px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-red-300 shadow-[0_10px_30px_rgba(127,29,29,0.16)] transition-all hover:-translate-y-0.5 hover:border-red-400/35 hover:bg-[linear-gradient(180deg,rgba(153,27,27,0.22),rgba(69,10,10,0.18))] hover:text-red-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/12 text-red-300">
                <LogOut className="h-4 w-4" />
              </span>
              <span>Chiqish</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="min-w-0 flex-1 overflow-auto bg-[#fbfcfd]">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full bg-white shadow-inner border border-indigo-100 flex items-center justify-center">
                <img
                  src={sidebarLogoSrc}
                  alt="Logo"
                  className="h-full w-full scale-[0.9] object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === "true") {
                      img.src = 'https://via.placeholder.com/40?text=A';
                      return;
                    }
                    img.dataset.fallbackApplied = "true";
                    img.src = BRAND_LOGO_FALLBACK_URL;
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-none text-slate-900">{siteTitle}</p>
                <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">{siteSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Menyuni ochish"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-10">
        <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center font-bold text-gray-500">Sahifa yuklanmoqda...</div>}>
          <Routes>
            <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminDashboard data={data} reloadData={reloadData} /> : <Navigate to="/" />} />
            <Route path="/participant" element={user.role === UserRole.PARTICIPANT ? <ParticipantDashboard user={user} data={data} updateData={updateData} reloadData={reloadData} /> : <Navigate to="/" />} />
            <Route path="/manager" element={user.role === UserRole.MANAGER ? <ManagerDashboard data={data} /> : <Navigate to="/" />} />
            <Route path="/" element={<Navigate to={user.role === UserRole.ADMIN ? "/admin" : user.role === UserRole.MANAGER ? "/manager" : "/participant"} />} />
          </Routes>
        </Suspense>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [data, setData] = useState<any>(EMPTY_DATA);
  const [bootLoading, setBootLoading] = useState(true);

  const loadSnapshot = async () => {
    const snap = await getSnapshot();
    if (snap?.siteSettings) {
      persistSiteSettings(snap.siteSettings);
    }
    setData(snap || EMPTY_DATA);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const branding = await getSiteSettings();
        const nextBranding = branding || getInitialSiteSettings();
        persistSiteSettings(nextBranding);
        setData((prev: any) => ({ ...prev, siteSettings: nextBranding }));
      } catch {}

      if (!user || !authStorage.getAccess()) {
        setBootLoading(false);
        return;
      }
      try {
        const me = await getMe();
        setUser(me);
        sessionStorage.setItem('current_user', JSON.stringify(me));
        await loadSnapshot();
      } catch {
        authStorage.clear();
        sessionStorage.removeItem('current_user');
        setUser(null);
        setData((prev: any) => ({ ...EMPTY_DATA, siteSettings: prev?.siteSettings || getInitialSiteSettings() }));
      } finally {
        setBootLoading(false);
      }
    };
    bootstrap();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const res = await login(username, password);
    setUser(res.user);
    sessionStorage.setItem('current_user', JSON.stringify(res.user));
    await loadSnapshot();
  };

  const handleLogout = () => {
    const preservedSiteSettings = data.siteSettings || getInitialSiteSettings();
    persistSiteSettings(preservedSiteSettings);
    setUser(null);
    authStorage.clear();
    sessionStorage.removeItem('current_user');
    setData({ ...EMPTY_DATA, siteSettings: preservedSiteSettings });
  };

  const updateData = (newData: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      setData((prev: any) => {
        const merged = { ...prev, ...newData };
        resolve();
        return merged;
      });
    });
  };

  if (bootLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">Yuklanmoqda...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} branding={data.siteSettings} />;
  }

  return (
    <HashRouter>
      <AppContent user={user} data={data} updateData={updateData} reloadData={loadSnapshot} onLogout={handleLogout} />
    </HashRouter>
  );
};

export default App;
