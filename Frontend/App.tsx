
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import { authStorage, getMe, getSnapshot, login, syncSnapshot } from './api';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import ParticipantDashboard from './views/ParticipantDashboard';
import ManagerDashboard from './views/ManagerDashboard';
import { LogOut, Shield, GraduationCap, Activity, LayoutDashboard, BarChart3 } from 'lucide-react';

const BRAND_LOGO_URL = "/logo.png";
const BRAND_LOGO_FALLBACK_URL = "https://raw.githubusercontent.com/ai-gen-images/assets/main/logo_badiiy.png";
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

const AppContent: React.FC<{ user: User, data: any, updateData: (d: any) => Promise<void>, onLogout: () => void }> = ({ user, data, updateData, onLogout }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  const isMainAdminTab = !currentTab || ['subjects', 'tests', 'groups', 'users'].includes(currentTab);
  const isDemoAdminTab = ['demo-subjects', 'demo-tests'].includes(currentTab || '');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-[#1a1a1a] text-white flex flex-col shadow-2xl z-50">
        <div className="p-7 border-b border-[#333333] flex items-center gap-4 bg-gradient-to-r from-[#171717] to-[#1e1e1e]">
          <div className="bg-white p-1.5 rounded-2xl shadow-inner border-2 border-indigo-200 ring-2 ring-indigo-500/20">
            <img 
              src={BRAND_LOGO_URL}
              alt="Logo" 
              className="w-12 h-12 object-contain" 
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
            <h1 className="text-lg font-black tracking-tighter leading-none">ART EDU</h1>
            <p className="text-[10px] font-black text-indigo-500 tracking-widest uppercase mt-1">Test Platform</p>
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
        </nav>

        <div className="p-6 border-t border-[#333333] bg-[#151515]">
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
            className="flex items-center justify-center gap-3 w-full py-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" /> Chiqish
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto p-10 bg-[#fbfcfd]">
        <Routes>
          <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminDashboard data={data} updateData={updateData} /> : <Navigate to="/" />} />
          <Route path="/participant" element={user.role === UserRole.PARTICIPANT ? <ParticipantDashboard user={user} data={data} updateData={updateData} /> : <Navigate to="/" />} />
          <Route path="/manager" element={user.role === UserRole.MANAGER ? <ManagerDashboard data={data} /> : <Navigate to="/" />} />
          <Route path="/" element={<Navigate to={user.role === UserRole.ADMIN ? "/admin" : user.role === UserRole.MANAGER ? "/manager" : "/participant"} />} />
        </Routes>
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
    setData(snap || EMPTY_DATA);
  };

  useEffect(() => {
    const bootstrap = async () => {
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
        setData(EMPTY_DATA);
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
    setUser(null);
    authStorage.clear();
    sessionStorage.removeItem('current_user');
    setData(EMPTY_DATA);
  };

  const updateData = (newData: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      setData((prev: any) => {
        const merged = { ...prev, ...newData };
        if (user?.role === UserRole.ADMIN) {
          syncSnapshot(merged)
            .then((serverState) => {
              setData(serverState);
              resolve();
            })
            .catch((err) => {
              alert(`Saqlashda xatolik: ${err?.message || "Noma'lum xato"}`);
              reject(err);
            });
        } else {
          resolve();
        }
        return merged;
      });
    });
  };

  if (bootLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-600">Yuklanmoqda...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <AppContent user={user} data={data} updateData={updateData} onLogout={handleLogout} />
    </HashRouter>
  );
};

export default App;

