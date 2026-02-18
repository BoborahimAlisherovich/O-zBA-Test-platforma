
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, CheckCircle, XCircle, TrendingUp, Filter, Calendar } from 'lucide-react';

const ManagerDashboard: React.FC<{ data: any }> = ({ data }) => {
  // --- CURRENT MONTH LOGIC ---
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const filteredResults = data.results.filter((r: any) => {
      const d = new Date(r.date);
      return d >= startOfMonth && d <= endOfMonth;
    });

    // formatting month name to full string
    const rawMonth = now.toLocaleString('uz-UZ', { month: 'long' });
    const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

    return { filteredResults, monthName };
  }, [data.results]);

  const stats = [
    { label: 'Umumiy tinglovchilar', value: data.users.filter((u: any) => u.role === 'TINGLOVCHI').length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'O\'tilgan testlar (Bu oy)', value: currentMonthStats.filteredResults.length, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Muvaffaqiyatli', value: currentMonthStats.filteredResults.filter((r: any) => r.isPassed).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Muvaffaqiyatsiz', value: currentMonthStats.filteredResults.filter((r: any) => !r.isPassed).length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const chartData = data.groups.map((g: any) => {
    const groupResults = currentMonthStats.filteredResults.filter((r: any) => r.groupId === g.id);
    const passed = groupResults.filter((r: any) => r.isPassed).length;
    return { name: g.name.split('-')[0], otdi: passed, yiqildi: groupResults.length - passed };
  });

  const pieData = [
    { name: 'O\'tdi', value: currentMonthStats.filteredResults.filter((r: any) => r.isPassed).length },
    { name: 'Yiqildi', value: currentMonthStats.filteredResults.filter((r: any) => !r.isPassed).length },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Menejer Paneli</h2>
          <div className="flex items-center gap-2 text-indigo-600 font-bold mt-1 bg-indigo-50 px-4 py-1.5 rounded-full w-fit shadow-sm">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{currentMonthStats.monthName} oyi statistikasi (ART EDU TEST)</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 ${s.bg} ${s.color} rounded-xl shadow-inner`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider leading-none mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Guruhlar samaradorligi ({currentMonthStats.monthName})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="otdi" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="yiqildi" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-lg font-bold mb-6 self-start text-gray-800">Muvaffaqiyat ko'rsatkichi</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"/> <span className="text-sm font-bold text-gray-600">O'tdi</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"/> <span className="text-sm font-bold text-gray-600">Yiqildi</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
