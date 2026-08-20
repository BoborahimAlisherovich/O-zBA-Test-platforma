import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SiteSettings, User, Group, Subject, Module, Question, UserRole, TestResult, ResultArchiveFolder } from '../types';
import {
  createResultArchiveFolder,
  createGroup,
  createModule,
  createQuestion,
  createSubject,
  createUser,
  deleteGroup,
  deleteModule,
  deleteQuestion,
  deleteResultArchiveFolder,
  deleteResult,
  deleteSubject,
  deleteUser,
  importQuestions,
  importUsers,
  updateGroup,
  updateModule,
  updateQuestion,
  updateResult,
  updateSiteSettings,
  updateSubject,
  updateUser,
} from '../api';
import { 
  Plus, Users, BookOpen, Layers, Upload, Trash2, Edit2, 
  X, Settings, CheckSquare, 
  Square, ChevronRight, Search, UserPlus, UserMinus, BarChart,
  FileSpreadsheet, HelpCircle, TrendingUp, PieChart as PieIcon, Activity, BarChart3,
  Clock, Award, Target, Power, Download, Archive, ArchiveRestore, List, CalendarDays, RotateCcw
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

interface AdminDashboardProps {
  data: any;
  reloadData: () => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, reloadData }) => {
  const loadXLSX = () => import('xlsx');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'subjects';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const isDemoTab = activeTab === 'demo-subjects' || activeTab === 'demo-tests';
  const isSubjectsTab = activeTab === 'subjects' || activeTab === 'demo-subjects';
  const isTestsTab = activeTab === 'tests' || activeTab === 'demo-tests';
  
  // Detail views
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isAddUsersToGroupModalOpen, setIsAddUsersToGroupModalOpen] = useState(false);
  const [isGroupListModalOpen, setIsGroupListModalOpen] = useState(false);
  const [isGroupArchiveModalOpen, setIsGroupArchiveModalOpen] = useState(false);
  
  // States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [userFilters, setUserFilters] = useState({ fullName: '', username: '', workplace: '', groupId: '' });
  const [resultFilters, setResultFilters] = useState({ fullName: '', workplace: '', groupId: '', date: '', status: '' });
  const [archiveFolderName, setArchiveFolderName] = useState('');
  const [selectedResultIds, setSelectedResultIds] = useState<Array<string | number>>([]);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [openedArchiveFolderId, setOpenedArchiveFolderId] = useState<string | number | null>(null);
  const [openedArchivedUserFolderId, setOpenedArchivedUserFolderId] = useState<string | number | 'ungrouped' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Forms
  const [userForm, setUserForm] = useState({ fullName: '', username: '', password: '', workplace: '', role: UserRole.PARTICIPANT, groupId: '' });
  const [groupForm, setGroupForm] = useState<{ name: string; moduleIds: string[] }>({ name: '', moduleIds: [] });
  const [subjectForm, setSubjectForm] = useState({ name: '' });
  const [siteSettingsForm, setSiteSettingsForm] = useState<SiteSettings>({
    loginLogo: data.siteSettings?.loginLogo || '',
    sidebarLogo: data.siteSettings?.sidebarLogo || '',
    siteTitle: data.siteSettings?.siteTitle || 'ART EDU',
    siteSubtitle: data.siteSettings?.siteSubtitle || 'Test Platform',
    demoMaxAttempts: data.siteSettings?.demoMaxAttempts || 5,
  });
  const [loginLogoFile, setLoginLogoFile] = useState<File | null>(null);
  const [sidebarLogoFile, setSidebarLogoFile] = useState<File | null>(null);
  const [clearLoginLogo, setClearLoginLogo] = useState(false);
  const [clearSidebarLogo, setClearSidebarLogo] = useState(false);
  
  const DEFAULT_TEST_FORM = {
    name: '',
    groupIds: [],
    subjectConfigs: [],
    settings: { pointsPerAnswer: 5, durationMinutes: 30, passingScore: 60, randomize: true, isActive: true }
  };

  const [testForm, setTestForm] = useState<Omit<Module, 'id'>>(DEFAULT_TEST_FORM);
  const [questionForm, setQuestionForm] = useState<Omit<Question, 'id' | 'subjectId'>>({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0
  });

  const userExcelInputRef = useRef<HTMLInputElement>(null);
  const questionExcelInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const sidebarLogoInputRef = useRef<HTMLInputElement>(null);
  const tableWrapClass = "overflow-x-auto rounded-2xl border border-slate-200 bg-white";
  const tableClass = "w-full text-left min-w-[720px]";
  const thClass = "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-200";
  const tdClass = "px-5 py-4 text-sm border-b border-slate-100 align-middle";
  const currentSubjects: Subject[] = (isDemoTab ? data.demoSubjects : data.subjects) || [];
  const currentQuestions: Question[] = (isDemoTab ? data.demoQuestions : data.questions) || [];
  const currentModules: Module[] = (isDemoTab ? data.demoModules : data.modules) || [];

  // Clear views when tab changes
  useEffect(() => {
    setSelectedSubjectId(null);
    setSelectedGroupId(null);
  }, [activeTab]);

  useEffect(() => {
    setSiteSettingsForm({
      loginLogo: data.siteSettings?.loginLogo || '',
      sidebarLogo: data.siteSettings?.sidebarLogo || '',
      siteTitle: data.siteSettings?.siteTitle || 'ART EDU',
      siteSubtitle: data.siteSettings?.siteSubtitle || 'Test Platform',
      demoMaxAttempts: data.siteSettings?.demoMaxAttempts || 5,
    });
    setLoginLogoFile(null);
    setSidebarLogoFile(null);
    setClearLoginLogo(false);
    setClearSidebarLogo(false);
  }, [data.siteSettings]);

  const runAdminMutation = async (work: () => Promise<any>, successMessage?: string) => {
    try {
      await work();
      await reloadData();
      if (successMessage) alert(successMessage);
    } catch (err: any) {
      alert(`Xatolik: ${err?.message || "Noma'lum xato"}`);
      throw err;
    }
  };

  // --- MONITORING DATA ---
  const monitoringStats = useMemo(() => {
    const results = data.results || [];
    const users = data.users || [];
    const monthNames = ["Yan", "Feb", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
    const monthlyData = monthNames.map((name, index) => {
      const count = results.filter((r: TestResult) => new Date(r.date).getMonth() === index).length;
      return { name, count };
    });

    const groupData = (data.groups || []).map((g: Group) => {
      const gResults = results.filter((r: TestResult) => String(r.groupId) === String(g.id));
      const passed = gResults.filter((r: TestResult) => r.isPassed).length;
      const failed = gResults.length - passed;
      return { 
        name: g.name.length > 15 ? g.name.substring(0, 12) + '...' : g.name, 
        otdi: passed, 
        yiqildi: failed 
      };
    });

    const subjectData = (data.subjects || []).map((s: Subject) => {
      const mResults = results.filter((r: TestResult) => {
         const m = (data.modules || []).find((mod: Module) => String(mod.id) === String(r.moduleId));
         return m && m.subjectConfigs.some(sc => String(sc.subjectId) === String(s.id));
      });
      const passed = mResults.filter((r: TestResult) => r.isPassed).length;
      const failed = mResults.length - passed;
      return {
        name: s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name,
        otdi: passed,
        yiqildi: failed,
      };
    }).filter((d: any) => d.otdi > 0 || d.yiqildi > 0);

    const topUsersData = results.reduce((acc: any, r: TestResult) => {
       const key = r.participantId;
       if (!acc[key]) acc[key] = { id: key, score: 0, count: 0, passed: 0 };
       acc[key].score += r.score;
       acc[key].count += 1;
       if (r.isPassed) acc[key].passed += 1;
       return acc;
    }, {});
    
    const topUsers = Object.values(topUsersData)
       .map((u: any) => {
           const user = users.find((user: any) => String(user.id) === String(u.id));
           const group = (data.groups || []).find((g: any) => String(g.id) === String(user?.groupId));
           return { 
               ...u, 
               avgScore: Math.round(u.score / u.count), 
               name: user?.fullName || "Noma'lum", 
               group: group?.name || "Guruhsiz" 
           };
       })
       .sort((a: any, b: any) => b.avgScore - a.avgScore)
       .slice(0, 10);

    const totalPassed = results.filter((r: TestResult) => r.isPassed).length;
    const totalFailed = results.length - totalPassed;
    const pieData = [
      { name: "O'tganlar", value: totalPassed, color: '#10b981' },
      { name: "Yiqilganlar", value: totalFailed, color: '#ef4444' }
    ];

    return { monthlyData, groupData, pieData, subjectData, topUsers };
  }, [data]);

  const stats = useMemo(() => ({
    totalUsers: (data.users || []).length,
    totalQuestions: (data.questions || []).length,
    totalSubjects: (data.subjects || []).length,
    totalGroups: (data.groups || []).length
  }), [data]);

  const activeGroups = useMemo(
    () => (data.groups || []).filter((group: Group) => !group.isArchived),
    [data.groups]
  );

  const archivedGroups = useMemo(
    () => (data.groups || []).filter((group: Group) => group.isArchived),
    [data.groups]
  );

  const assignedUsersCount = useMemo(
    () => (data.users || []).filter((user: User) => Boolean(user.groupId)).length,
    [data.users]
  );

  const archivedUsers = useMemo(
    () => (data.archivedUsers || []) as User[],
    [data.archivedUsers]
  );

  const resultArchiveFolders = useMemo(
    () => (data.resultArchiveFolders || []) as ResultArchiveFolder[],
    [data.resultArchiveFolders]
  );

  const archivedResults = useMemo(
    () => (data.archivedResults || []) as TestResult[],
    [data.archivedResults]
  );

  const archivedUserFolders = useMemo(() => {
    const buckets = new Map<string, { id: string | number | 'ungrouped'; name: string; users: User[] }>();

    archivedUsers.forEach((user) => {
      const group = (data.groups || []).find((item: Group) => String(item.id) === String(user.groupId));
      const folderId = group?.id ?? 'ungrouped';
      const folderName = group?.name || 'Guruhsiz foydalanuvchilar';
      const key = String(folderId);

      if (!buckets.has(key)) {
        buckets.set(key, { id: folderId, name: folderName, users: [] });
      }
      buckets.get(key)?.users.push(user);
    });

    return Array.from(buckets.values()).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  }, [archivedUsers, data.groups]);

  const openedArchivedUserFolder = useMemo(
    () => archivedUserFolders.find((folder) => String(folder.id) === String(openedArchivedUserFolderId)) || null,
    [archivedUserFolders, openedArchivedUserFolderId]
  );

  const openedArchiveFolder = useMemo(
    () => resultArchiveFolders.find((folder) => String(folder.id) === String(openedArchiveFolderId)) || null,
    [resultArchiveFolders, openedArchiveFolderId]
  );

  const openedArchiveResults = useMemo(
    () => archivedResults.filter((result) => String(result.archiveFolderId) === String(openedArchiveFolderId)),
    [archivedResults, openedArchiveFolderId]
  );

  // --- HELPER FUNCTIONS (Optimized for F.I.SH matching) ---
  const getParticipantName = (participantId: any) => {
    if (!participantId) return "Noma'lum";
    const foundUser = (data.users || []).find((u: User) => String(u.id).trim() === String(participantId).trim())
      || archivedUsers.find((u: User) => String(u.id).trim() === String(participantId).trim());
    return foundUser ? foundUser.fullName : "Noma'lum";
  };

  const getModuleName = (moduleId: any) => {
    if (!moduleId) return "—";
    const foundModule = (data.modules || []).find((m: Module) => String(m.id).trim() === String(moduleId).trim());
    return foundModule ? foundModule.name : "—";
  };

  const getParticipantWorkplace = (participantId: any) => {
    if (!participantId) return "—";
    const foundUser = (data.users || []).find((u: User) => String(u.id).trim() === String(participantId).trim())
      || archivedUsers.find((u: User) => String(u.id).trim() === String(participantId).trim());
    return foundUser?.workplace || "—";
  };

  const getParticipantGroupName = (participantId: any) => {
    if (!participantId) return "—";
    const foundUser = (data.users || []).find((u: User) => String(u.id).trim() === String(participantId).trim())
      || archivedUsers.find((u: User) => String(u.id).trim() === String(participantId).trim());
    return (data.groups || []).find((g: Group) => String(g.id) === String(foundUser?.groupId))?.name || "—";
  };

  const formatDateUz = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const filteredUsers = useMemo(() => {
    return (data.users || []).filter((u: User) => {
      const groupName = (data.groups || []).find((g: Group) => String(g.id) === String(u.groupId))?.name || '';
      return (
        u.fullName.toLowerCase().includes(userFilters.fullName.toLowerCase()) &&
        u.username.toLowerCase().includes(userFilters.username.toLowerCase()) &&
        (u.workplace || '').toLowerCase().includes(userFilters.workplace.toLowerCase()) &&
        (!userFilters.groupId || String(u.groupId || '') === String(userFilters.groupId) || groupName.toLowerCase().includes(userFilters.groupId.toLowerCase()))
      );
    });
  }, [data.users, data.groups, userFilters]);

  const filteredResults = useMemo(() => {
    return (data.results || []).filter((r: TestResult) => {
      const participantName = getParticipantName(r.participantId).toLowerCase();
      const workplace = getParticipantWorkplace(r.participantId).toLowerCase();
      const groupName = getParticipantGroupName(r.participantId).toLowerCase();
      const resultDate = r.date ? new Date(r.date).toISOString().slice(0, 10) : '';
      const statusValue = r.isPassed ? 'passed' : 'failed';
      return (
        participantName.includes(resultFilters.fullName.toLowerCase()) &&
        workplace.includes(resultFilters.workplace.toLowerCase()) &&
        (!resultFilters.groupId || groupName.includes(resultFilters.groupId.toLowerCase()) || String(r.groupId || '') === String(resultFilters.groupId)) &&
        (!resultFilters.date || resultDate === resultFilters.date) &&
        (!resultFilters.status || statusValue === resultFilters.status)
      );
    });
  }, [data.results, resultFilters, data.users, archivedUsers, data.groups]);

  // --- ACTIONS ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUsers = [...(data.users || [])];
    const exists = currentUsers.some(u => u.username === userForm.username && u.id !== editingId);
    if (exists) {
      alert("Xatolik: Ushbu login band!");
      return;
    }
    const payload = {
      ...userForm,
      groupId: userForm.groupId || null
    };
    await runAdminMutation(
      () => editingId ? updateUser(editingId, payload) : createUser(payload),
      "Foydalanuvchi saqlandi."
    );
    setIsUserModalOpen(false);
    setEditingId(null);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: groupForm.name,
      moduleIds: groupForm.moduleIds,
      isArchived: false,
    };
    await runAdminMutation(
      () => editingId ? updateGroup(editingId, payload) : createGroup(payload),
      "Guruh saqlandi."
    );
    setIsGroupModalOpen(false);
    setEditingId(null);
  };

  const handleArchiveGroup = async (groupId: string) => {
    const group = (data.groups || []).find((item: Group) => String(item.id) === String(groupId));
    if (!group) return;
    await runAdminMutation(() => updateGroup(groupId, { ...group, isArchived: true }), "Guruh arxivlandi.");
  };

  const handleRestoreGroup = async (groupId: string) => {
    const group = (data.groups || []).find((item: Group) => String(item.id) === String(groupId));
    if (!group) return;
    await runAdminMutation(() => updateGroup(groupId, { ...group, isArchived: false }), "Guruh qaytarildi.");
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAdminMutation(
      () => editingId ? updateSubject(editingId, { name: subjectForm.name, isDemo: isDemoTab }) : createSubject({ name: subjectForm.name }, isDemoTab),
      "Fan saqlandi."
    );
    setIsSubjectModalOpen(false);
    setEditingId(null);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testForm.subjectConfigs.length === 0) {
      alert("Xatolik: Kamida bitta fan biriktiring!");
      return;
    }
    const sanitizedTest = {
      ...testForm,
      subjectConfigs: testForm.subjectConfigs.filter((config: any) => config.subjectId && config.questionCount > 0)
    };
    if (sanitizedTest.subjectConfigs.length === 0) {
      alert("Xatolik: Fanlar uchun savol soni 1 dan katta bo'lishi shart!");
      return;
    }

    await runAdminMutation(
      () => editingId ? updateModule(editingId, { ...sanitizedTest, isDemo: isDemoTab }) : createModule(sanitizedTest, isDemoTab),
      "Test moduli saqlandi."
    );
    setIsTestModalOpen(false);
    setEditingId(null);
  };

  const toggleSubjectInTestForm = (subjectId: string) => {
    const exists = testForm.subjectConfigs.some((config: any) => config.subjectId === subjectId);
    if (exists) {
      setTestForm({
        ...testForm,
        subjectConfigs: testForm.subjectConfigs.filter((config: any) => config.subjectId !== subjectId)
      });
      return;
    }
    setTestForm({
      ...testForm,
      subjectConfigs: [...testForm.subjectConfigs, { subjectId, questionCount: 5 }]
    });
  };

  const updateSubjectQuestionCount = (subjectId: string, count: number) => {
    setTestForm({
      ...testForm,
      subjectConfigs: testForm.subjectConfigs.map((config: any) =>
        config.subjectId === subjectId ? { ...config, questionCount: Math.max(1, count || 1) } : config
      )
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    const payload = { ...questionForm, subjectId: selectedSubjectId };
    await runAdminMutation(
      () => editingId ? updateQuestion(editingId, payload) : createQuestion(payload),
      "Savol saqlandi."
    );
    setIsQuestionModalOpen(false);
    setEditingId(null);
  };

  const handleExportResults = async () => {
    const results = data.results || [];
    if (results.length === 0) {
      alert("Eksport qilish uchun natijalar mavjud emas!");
      return;
    }
    const XLSX = await loadXLSX();

    const exportData = results.map((r: TestResult) => {
      const user = (data.users || []).find((u: any) => String(u.id).trim() === String(r.participantId).trim());
      const module = (data.modules || []).find((m: any) => String(m.id).trim() === String(r.moduleId).trim());
      const group = (data.groups || []).find((g: any) => String(g.id).trim() === String(r.groupId).trim());

      return {
        "F.I.SH": user?.fullName || "Noma'lum",
        "Login": user?.username || "—",
        "Asosiy ish joyi": user?.workplace || "—",
        "Guruh": group?.name || "—",
        "Test Moduli": module?.name || "—",
        "To'g'ri javoblar": r.correctAnswers,
        "Jami savollar": r.totalQuestions,
        "To'plangan ball": r.score,
        "Sana": new Date(r.date).toLocaleDateString('uz-UZ'),
        "Holat": r.isPassed ? "O'TDI" : "YIQILDI"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Natijalar");
    XLSX.writeFile(wb, `ARTEDU_Natijalar_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkGroupAssign = async () => {
    if (!selectedGroupId) return;
    await runAdminMutation(
      () => Promise.all(
        (data.users || [])
          .filter((u: User) => selectedUserIds.includes(String(u.id)))
          .map((u: User) => updateUser(u.id, { ...u, groupId: selectedGroupId }))
      ),
      "Tinglovchilar muvaffaqiyatli biriktirildi."
    );
    setSelectedUserIds([]);
    setIsAddUsersToGroupModalOpen(false);
  };

  const getGroupUserStatus = (userId: string, groupId: string) => {
    const group = (data.groups || []).find((g: Group) => String(g.id) === String(groupId));
    const groupModuleIds = group?.moduleIds || [];
    const userResults = (data.results || []).filter((result: TestResult) => {
      const inGroup = String(result.groupId) === String(groupId);
      const byUser = String(result.participantId) === String(userId);
      const inModuleScope = groupModuleIds.length === 0 || groupModuleIds.includes(result.moduleId);
      return inGroup && byUser && inModuleScope;
    });

    if (userResults.length === 0) return { label: "Qatnashmagan", tone: "bg-slate-100 text-slate-700", canRestart: false };
    const hasPassed = userResults.some((result: TestResult) => result.isPassed);
    if (hasPassed) return { label: "Muvaffaqiyatli topshirgan", tone: "bg-emerald-100 text-emerald-700", canRestart: false };
    return { label: "Yiqilgan", tone: "bg-rose-100 text-rose-700", canRestart: true };
  };

  const handleAllowRestart = async (userId: string, groupId: string) => {
    const group = (data.groups || []).find((g: Group) => String(g.id) === String(groupId));
    const groupModuleIds = group?.moduleIds || [];
    const targetResults = (data.results || []).filter((result: TestResult) => {
      const isTargetUser = String(result.participantId) === String(userId);
      const isTargetGroup = String(result.groupId) === String(groupId);
      const inModuleScope = groupModuleIds.length === 0 || groupModuleIds.includes(result.moduleId);
      return isTargetUser && isTargetGroup && inModuleScope && !result.isPassed;
    });
    await runAdminMutation(
      () => Promise.all(targetResults.map((result: TestResult) => deleteResult(result.id))),
      "Qayta topshirish uchun ruxsat berildi."
    );
  };

  const handleResultRestart = async (participantId: string, moduleId: string) => {
    const targetResults = (data.results || []).filter((result: TestResult) =>
      String(result.participantId) === String(participantId) && String(result.moduleId) === String(moduleId)
    );
    await runAdminMutation(
      () => Promise.all(targetResults.map((result: TestResult) => deleteResult(result.id))),
      "Foydalanuvchiga qayta test topshirish uchun ruxsat berildi."
    );
  };

  const handleArchiveUser = async (user: User) => {
    await runAdminMutation(
      () => updateUser(user.id, { ...user, isArchived: true }),
      "Foydalanuvchi arxivlandi."
    );
  };

  const handleRestoreUser = async (user: User) => {
    await runAdminMutation(
      () => updateUser(user.id, { ...user, isArchived: false }),
      "Foydalanuvchi arxivdan qaytarildi."
    );
  };

  const handleCreateArchiveFolder = async () => {
    const name = archiveFolderName.trim();
    if (!name) {
      alert("Arxiv papka nomini kiriting.");
      return;
    }
    await runAdminMutation(
      () => createResultArchiveFolder({ name }),
      "Arxiv papka yaratildi."
    );
    setArchiveFolderName('');
  };

  const handleArchiveSelectedResults = async (folderId: string | number) => {
    if (selectedResultIds.length === 0) {
      alert("Avval kamida bitta natijani tanlang.");
      return;
    }
    await runAdminMutation(
      () => Promise.all(selectedResultIds.map((id) => updateResult(id, { archiveFolderId: folderId }))),
      "Natijalar arxiv papkaga yuborildi."
    );
    setSelectedResultIds([]);
    setIsArchiveModalOpen(false);
  };

  const handleRestoreArchivedResult = async (resultId: string | number) => {
    await runAdminMutation(
      () => updateResult(resultId, { archiveFolderId: null }),
      "Natija arxivdan qaytarildi."
    );
  };

  const handleQuestionExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubjectId) return;
    try {
      const result = await importQuestions(file, selectedSubjectId);
      await reloadData();
      alert(`${result.created || 0} ta savol yuklandi.${result.skipped ? ` O'tkazib yuborildi: ${result.skipped}` : ''}`);
    } catch (err: any) {
      alert(`Import xatosi: ${err?.message || "Noma'lum xato"}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportGroupMembers = async (groupId: string) => {
    const group = (data.groups || []).find((g: Group) => String(g.id) === String(groupId));
    const groupUsers = (data.users || []).filter((u: User) => String(u.groupId) === String(groupId));
    if (groupUsers.length === 0) {
      alert("Ushbu guruhda eksport qilinadigan a'zolar yo'q.");
      return;
    }
    const XLSX = await loadXLSX();

    const exportData = groupUsers.map((u: User, idx: number) => ({
      "T/r": idx + 1,
      "F.I.SH": u.fullName,
      "Login": u.username,
      "Asosiy ish joyi": u.workplace || '—',
      "Rol": u.role,
      "Guruh": group?.name || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "A'zolar");
    const safeGroupName = (group?.name || 'Guruh').replace(/[\\/:*?"<>|]/g, '_');
    XLSX.writeFile(wb, `Guruh_Azolari_${safeGroupName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUserExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importUsers(file);
      await reloadData();
      const errors = Array.isArray(result.errors) && result.errors.length ? `\n${result.errors.join('\n')}` : '';
      alert(`${result.created || 0} ta yaratildi, ${result.updated || 0} ta yangilandi, ${result.skipped || 0} ta o'tkazib yuborildi.${errors}`);
    } catch (err: any) {
      alert(`Excel xatosi: ${err?.message || "Noma'lum xato"}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleSiteLogoChange = async (type: 'loginLogo' | 'sidebarLogo', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const previewUrl = URL.createObjectURL(file);
      if (type === 'loginLogo') {
        setLoginLogoFile(file);
        setClearLoginLogo(false);
      } else {
        setSidebarLogoFile(file);
        setClearSidebarLogo(false);
      }
      setSiteSettingsForm((prev) => ({ ...prev, [type]: previewUrl }));
    } catch {
      alert("Logo faylini o'qishda xatolik yuz berdi.");
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('siteTitle', siteSettingsForm.siteTitle || '');
    formData.append('siteSubtitle', siteSettingsForm.siteSubtitle || '');
    formData.append('demoMaxAttempts', String(Math.max(1, Number(siteSettingsForm.demoMaxAttempts || 1))));
    if (loginLogoFile) formData.append('loginLogoFile', loginLogoFile);
    if (sidebarLogoFile) formData.append('sidebarLogoFile', sidebarLogoFile);
    if (clearLoginLogo) formData.append('clearLoginLogo', 'true');
    if (clearSidebarLogo) formData.append('clearSidebarLogo', 'true');
    await runAdminMutation(() => updateSiteSettings(formData), "Sayt sozlamalari saqlandi.");
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Users, label: 'Foydalanuvchilar', value: stats.totalUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: HelpCircle, label: 'Savollar bazasi', value: stats.totalQuestions, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: BookOpen, label: 'Fanlar', value: stats.totalSubjects, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Layers, label: 'Guruhlar', value: stats.totalGroups, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <header className="mb-8">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">
          {activeTab === 'monitoring' ? 'Monitoring va Statistika' : 
           activeTab === 'results' ? 'Barcha Natijalar' : 
           isDemoTab ? 'Demo Testlar' : 'Boshqaruv Paneli'}
        </h2>
      </header>

      {activeTab !== 'monitoring' && activeTab !== 'results' && (
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl mb-10 w-fit overflow-x-auto no-scrollbar">
          {(isDemoTab
            ? [
                { id: 'demo-subjects', label: `Demo Fanlar`, icon: BookOpen },
                { id: 'demo-tests', label: `Demo Test Modullari`, icon: Settings },
              ]
            : [
                { id: 'subjects', label: `Fanlar`, icon: BookOpen },
                { id: 'tests', label: `Test Modullari`, icon: Settings },
                { id: 'groups', label: `Guruhlar`, icon: Layers },
                { id: 'users', label: `Foydalanuvchilar`, icon: Users },
                { id: 'site-settings', label: `Sayt sozlamalari`, icon: Settings },
              ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-5 h-5" /> {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* MONITORING VIEW */}
      {activeTab === 'monitoring' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                  <h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Oylar dinamikasi</h4>
               </div>
               <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={monitoringStats.monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} /></LineChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
               <div className="flex items-center gap-3 mb-8 self-start"><div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><PieIcon className="w-5 h-5" /></div><h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Umumiy o'zlashtirish</h4></div>
               <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><RePieChart><Pie data={monitoringStats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{monitoringStats.pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}</Pie><Tooltip /><Legend /></RePieChart></ResponsiveContainer></div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Layers className="w-5 h-5" /></div>
                <h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Guruhlar natijalari</h4>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={monitoringStats.groupData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="otdi" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="yiqildi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><BookOpen className="w-5 h-5" /></div>
                <h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Fanlar o'zlashtirishi</h4>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={monitoringStats.subjectData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="otdi" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="yiqildi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mt-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Users className="w-5 h-5" /></div>
                <h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Top 10 O'quvchilar</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-4 font-black text-gray-400 uppercase tracking-wider text-xs">O'rin</th>
                      <th className="py-4 px-4 font-black text-gray-400 uppercase tracking-wider text-xs">F.I.SH</th>
                      <th className="py-4 px-4 font-black text-gray-400 uppercase tracking-wider text-xs">Guruh</th>
                      <th className="py-4 px-4 font-black text-gray-400 uppercase tracking-wider text-xs text-right">O'rtacha Ball</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoringStats.topUsers.map((u: any, idx: number) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">{u.name}</td>
                        <td className="py-4 px-4 text-gray-500 font-medium">{u.group}</td>
                        <td className="py-4 px-4 text-right font-black text-indigo-600">{u.avgScore}</td>
                      </tr>
                    ))}
                    {monitoringStats.topUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">Hozircha ma'lumot yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {activeTab === 'results' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border border-gray-100">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Barcha Test Natijalari</h3>
                <p className="mt-1 text-sm text-slate-500">Faol natijalar ro'yxati, filtr va arxivlash boshqaruvi.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                >
                  <Archive className="w-5 h-5" /> Arxivlash
                </button>
                <button 
                  onClick={handleExportResults}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                >
                  <Download className="w-5 h-5" /> Excelga yuklash
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
              <input
                value={resultFilters.fullName}
                onChange={(e) => setResultFilters((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="F.I.SH bo'yicha filtr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <input
                value={resultFilters.workplace}
                onChange={(e) => setResultFilters((prev) => ({ ...prev, workplace: e.target.value }))}
                placeholder="Ish joyi bo'yicha filtr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <select
                value={resultFilters.groupId}
                onChange={(e) => setResultFilters((prev) => ({ ...prev, groupId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              >
                <option value="">Barcha guruhlar</option>
                {activeGroups.map((group: Group) => (
                  <option key={group.id} value={String(group.id)}>{group.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={resultFilters.date}
                onChange={(e) => setResultFilters((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <select
                value={resultFilters.status}
                onChange={(e) => setResultFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              >
                <option value="">Barcha holatlar</option>
                <option value="passed">O'tganlar</option>
                <option value="failed">Yiqilganlar</option>
              </select>
            </div>

            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={`${thClass} w-14 text-center`}>
                      <input
                        type="checkbox"
                        checked={filteredResults.length > 0 && selectedResultIds.length === filteredResults.length}
                        onChange={(e) => setSelectedResultIds(e.target.checked ? filteredResults.map((r: TestResult) => r.id) : [])}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className={thClass}>Tinglovchi</th>
                    <th className={thClass}>Asosiy ish joyi</th>
                    <th className={thClass}>Guruh</th>
                    <th className={`${thClass} text-center`}>Sana</th>
                    <th className={`${thClass} text-center`}>Ball</th>
                    <th className={`${thClass} text-center`}>Holat</th>
                    <th className={`${thClass} text-center`}>Restart</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredResults.map((r: TestResult) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} text-center`}>
                        <input
                          type="checkbox"
                          checked={selectedResultIds.includes(r.id)}
                          onChange={(e) => setSelectedResultIds((prev) => e.target.checked ? [...prev, r.id] : prev.filter((id) => String(id) !== String(r.id)))}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className={`${tdClass} text-slate-900 font-bold`}>{getParticipantName(r.participantId)}</td>
                      <td className={`${tdClass} text-slate-600`}>{getParticipantWorkplace(r.participantId)}</td>
                      <td className={`${tdClass} text-slate-600`}>{getParticipantGroupName(r.participantId)}</td>
                      <td className={`${tdClass} text-center text-slate-500`}>{new Date(r.date).toLocaleDateString('uz-UZ')}</td>
                      <td className={`${tdClass} text-center text-indigo-700 font-black`}>{r.score}</td>
                      <td className={`${tdClass} text-center`}>{r.isPassed ? <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">O'tdi</span> : <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Yiqildi</span>}</td>
                      <td className={`${tdClass} text-center`}>
                        <button
                          onClick={() => handleResultRestart(String(r.participantId), String(r.moduleId))}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold"
                          title="Qayta testga ruxsat"
                        >
                          <RotateCcw className="w-4 h-4" /> Ruxsat
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">
                        Filtrga mos faol natija topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Archive className="w-5 h-5 text-indigo-500" />
              <h4 className="text-xl font-black text-slate-900">Arxiv papkalari</h4>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
              <div className="space-y-3">
                {resultArchiveFolders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Hozircha arxiv papka yaratilmagan.
                  </div>
                )}
                {resultArchiveFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setOpenedArchiveFolderId(folder.id)}
                    className={`w-full rounded-[1.5rem] border p-5 text-left transition-all ${
                      String(openedArchiveFolderId) === String(folder.id)
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{folder.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {folder.resultsCount} ta natija • {formatDateUz(folder.created_at)}
                        </p>
                      </div>
                      <List className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/50 p-5">
                {openedArchiveFolder ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div>
                        <p className="text-xl font-black text-slate-900">{openedArchiveFolder.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Papka ichidagi foydalanuvchilar natijalari ro'yxati
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runAdminMutation(() => deleteResultArchiveFolder(openedArchiveFolder.id), "Arxiv papka o'chirildi.").then(() => setOpenedArchiveFolderId(null))}
                        className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600"
                      >
                        Papkani o'chirish
                      </button>
                    </div>
                    <div className={tableWrapClass}>
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={thClass}>Tinglovchi</th>
                            <th className={thClass}>Ish joyi</th>
                            <th className={thClass}>Guruh</th>
                            <th className={`${thClass} text-center`}>Sana</th>
                            <th className={`${thClass} text-center`}>Ball</th>
                            <th className={`${thClass} text-center`}>Holat</th>
                            <th className={`${thClass} text-center`}>Amal</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {openedArchiveResults.map((r: TestResult) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className={`${tdClass} text-slate-900 font-bold`}>{getParticipantName(r.participantId)}</td>
                              <td className={`${tdClass} text-slate-600`}>{getParticipantWorkplace(r.participantId)}</td>
                              <td className={`${tdClass} text-slate-600`}>{getParticipantGroupName(r.participantId)}</td>
                              <td className={`${tdClass} text-center text-slate-500`}>{formatDateUz(r.date)}</td>
                              <td className={`${tdClass} text-center text-indigo-700 font-black`}>{r.score}</td>
                              <td className={`${tdClass} text-center`}>{r.isPassed ? <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">O'tdi</span> : <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Yiqildi</span>}</td>
                              <td className={`${tdClass} text-center`}>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreArchivedResult(r.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                                >
                                  <ArchiveRestore className="w-4 h-4" /> Qaytarish
                                </button>
                              </td>
                            </tr>
                          ))}
                          {openedArchiveResults.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                                Bu papka ichida hozircha natijalar yo'q.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                    Chap tomondan arxiv papkani tanlang, shunda ichidagi foydalanuvchilar natijalari shu yerda ko'rinadi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECTS TAB */}
      {isSubjectsTab && !selectedSubjectId && (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-black text-gray-800">{isDemoTab ? 'Demo Fanlar Bazasi' : 'Fanlar Bazasi'}</h3>
             <button onClick={() => { setEditingId(null); setSubjectForm({name:''}); setIsSubjectModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-200">
               <Plus className="w-5 h-5" /> Yangi Fan
             </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={subjectSearchTerm}
              onChange={(e) => setSubjectSearchTerm(e.target.value)}
              placeholder="Fan nomi bo'yicha qidirish..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Fan nomi</th>
                  <th className={thClass}>Savollar soni</th>
                  <th className={`${thClass} text-right`}>Amallar</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentSubjects
                  .filter((s: Subject) => s.name.toLowerCase().includes(subjectSearchTerm.toLowerCase()))
                  .map((s: Subject) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className={`${tdClass} font-bold text-slate-900`}>{s.name}</td>
                    <td className={`${tdClass} text-slate-600`}>{currentQuestions.filter((q:any)=>q.subjectId === s.id).length} ta</td>
                    <td className={`${tdClass} text-right space-x-1`}>
                      <button onClick={() => setSelectedSubjectId(s.id)} className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">Savollar bazasi</button>
                      <button onClick={() => { setEditingId(s.id); setSubjectForm({name: s.name}); setIsSubjectModalOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 className="w-5 h-5" /></button>
                      <button onClick={async () => { if(confirm("O'chirilsinmi?")) await runAdminMutation(() => deleteSubject(s.id), "Fan o'chirildi."); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUESTION MANAGEMENT */}
      {selectedSubjectId && isSubjectsTab && (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border border-gray-100 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-10">
            <div>
              <button onClick={() => setSelectedSubjectId(null)} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-2 hover:translate-x-[-4px] transition-transform">
                <ChevronRight className="w-4 h-4 rotate-180" /> Orqaga
              </button>
              <h3 className="text-3xl font-black text-gray-900">{currentSubjects.find((s:any)=>s.id === selectedSubjectId)?.name} savollari</h3>
            </div>
            <div className="flex gap-3">
              <a href="/Savollar_shablon.xlsx" download className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-sm hover:bg-slate-200 transition-colors"><Download className="w-5 h-5" /> Shablon</a>
              <button onClick={() => questionExcelInputRef.current?.click()} className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-colors"><FileSpreadsheet className="w-5 h-5" /> Import</button>
              <button onClick={() => { setEditingId(null); setQuestionForm({text:'', options:['','','',''], correctIndex:0}); setIsQuestionModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100"><Plus className="w-5 h-5" /> Yangi Savol</button>
            </div>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={questionSearchTerm}
              onChange={(e) => setQuestionSearchTerm(e.target.value)}
              placeholder="Savol matni bo'yicha qidirish..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-4">
             {currentQuestions
               .filter((q: Question) => q.subjectId === selectedSubjectId && q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()))
               .map((q: Question, idx: number) => (
                <div key={q.id} className="p-8 bg-gray-50 rounded-[2rem] group border border-transparent hover:border-indigo-100 transition-all">
                  <div className="flex justify-between mb-4">
                    <p className="font-bold text-gray-800 text-lg">#{idx+1} {q.text}</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => { setEditingId(q.id); setQuestionForm({...q}); setIsQuestionModalOpen(true); }} className="p-2 text-indigo-500"><Edit2 className="w-5 h-5" /></button>
                       <button onClick={async () => { if(confirm("O'chirilsinmi?")) await runAdminMutation(() => deleteQuestion(q.id), "Savol o'chirildi."); }} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     {q.options.map((o, i) => (<div key={i} className={`p-4 rounded-xl text-sm font-bold ${q.correctIndex === i ? 'bg-green-100 text-green-700' : 'bg-white text-gray-400'}`}>{o}</div>))}
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* GURUHLAR TAB */}
      {activeTab === 'groups' && !selectedGroupId && (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100 animate-in slide-in-from-bottom-4">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h3 className="text-2xl font-black text-gray-800">Guruhlar Bo'limi</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setGroupSearchTerm(''); setIsGroupListModalOpen(true); }}
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-blue-100"
              >
                <List className="w-5 h-5" /> Aktiv guruhlar
              </button>
              <button
                onClick={() => { setGroupSearchTerm(''); setIsGroupArchiveModalOpen(true); }}
                className="bg-amber-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-amber-100"
              >
                <Archive className="w-5 h-5" /> Arxiv
              </button>
              <button
                onClick={() => { setEditingId(null); setGroupForm({name:'', moduleIds: []}); setIsGroupModalOpen(true); }}
                className="bg-indigo-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" /> Yangi Guruh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
              <p className="text-xs uppercase font-black text-slate-500 mb-1">Jami guruhlar</p>
              <p className="text-3xl font-black text-slate-900">{(data.groups || []).length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 p-5 bg-emerald-50">
              <p className="text-xs uppercase font-black text-emerald-600 mb-1">Aktiv</p>
              <p className="text-3xl font-black text-emerald-700">{activeGroups.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 p-5 bg-amber-50">
              <p className="text-xs uppercase font-black text-amber-600 mb-1">Arxiv</p>
              <p className="text-3xl font-black text-amber-700">{archivedGroups.length}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 p-5 bg-indigo-50">
              <p className="text-xs uppercase font-black text-indigo-600 mb-1">Biriktirilgan foydalanuvchi</p>
              <p className="text-3xl font-black text-indigo-700">{assignedUsersCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* GROUP MEMBER MANAGEMENT */}
      {selectedGroupId && activeTab === 'groups' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border border-gray-100 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-10">
            <div><button onClick={() => setSelectedGroupId(null)} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-2 hover:translate-x-[-4px] transition-transform"><ChevronRight className="w-4 h-4 rotate-180" /> Orqaga</button><h3 className="text-3xl font-black text-gray-900">{(data.groups || []).find((g:any)=>String(g.id) === String(selectedGroupId))?.name} a'zolari</h3></div>
            <button onClick={() => { setSelectedUserIds([]); setUserSearchTerm(''); setIsAddUsersToGroupModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100"><UserPlus className="w-6 h-6" /> Tinglovchi Biriktirish</button>
          </div>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>F.I.SH (Tinglovchi)</th>
                  <th className={thClass}>Login</th>
                  <th className={thClass}>Asosiy ish joyi</th>
                  <th className={thClass}>Holat</th>
                  <th className={`${thClass} text-right`}>Amallar</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.users.filter((u:any)=>String(u.groupId) === String(selectedGroupId)).map((u:any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-bold text-slate-900`}>{u.fullName}</td>
                    <td className={`${tdClass} text-slate-600 font-medium`}>{u.username}</td>
                    <td className={`${tdClass} text-slate-600`}>{u.workplace || '—'}</td>
                    <td className={tdClass}>
                      {(() => {
                        const status = getGroupUserStatus(u.id, selectedGroupId || '');
                        return <span className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black ${status.tone}`}>{status.label}</span>;
                      })()}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {(() => {
                        const status = getGroupUserStatus(u.id, selectedGroupId || '');
                        if (!status.canRestart) return null;
                        return (
                          <button
                            onClick={() => handleAllowRestart(u.id, selectedGroupId || '')}
                            className="mr-2 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold"
                            title="Qayta topshirishga ruxsat"
                          >
                            <RotateCcw className="w-4 h-4" /> Restartga ruxsat
                          </button>
                        );
                      })()}
                      <button
                        onClick={async () => { if(confirm("Guruhdan chiqarilsinmi?")) await runAdminMutation(() => updateUser(u.id, { ...u, groupId: null }), "Foydalanuvchi guruhdan chiqarildi."); }}
                        className="p-2 text-red-400 hover:text-red-600 transition-all"
                        title="Guruhdan chiqarish"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isGroupListModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Aktiv Guruhlar Ro'yxati</h3>
                <p className="text-sm text-blue-100 mt-1">Ro'yxat modal ko'rinishida boshqariladi</p>
              </div>
              <button onClick={() => setIsGroupListModalOpen(false)} className="p-2 rounded-full hover:bg-white/20">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="p-8">
              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  placeholder="Guruh nomi bo'yicha qidirish..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Guruh</th>
                      <th className={thClass}>Yaratilgan sana</th>
                      <th className={thClass}>Tinglovchilar</th>
                      <th className={`${thClass} text-right`}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {activeGroups
                      .filter((g: Group) => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                      .map((g: Group) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className={`${tdClass} font-bold text-slate-900`}>{g.name}</td>
                          <td className={`${tdClass} text-slate-600`}>
                            <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-400" />{formatDateUz(g.createdAt)}</span>
                          </td>
                          <td className={`${tdClass} text-slate-600`}>{(data.users || []).filter((u:any)=>String(u.groupId) === String(g.id)).length} ta</td>
                          <td className={`${tdClass} text-right space-x-1`}>
                            <button onClick={() => { setIsGroupListModalOpen(false); setSelectedGroupId(g.id); }} className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">A'zolar</button>
                            <button onClick={() => { setEditingId(g.id); setGroupForm({name: g.name, moduleIds: g.moduleIds || []}); setIsGroupModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => handleArchiveGroup(g.id)} className="p-2 text-amber-500 hover:text-amber-700" title="Arxivlash"><Archive className="w-5 h-5" /></button>
                            <button onClick={async () => { if(confirm("O'chirilsinmi?")) await runAdminMutation(() => deleteGroup(g.id), "Guruh o'chirildi."); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                          </td>
                        </tr>
                    ))}
                    {activeGroups.filter((g: Group) => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())).length === 0 && (
                      <tr>
                        <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>Aktiv guruh topilmadi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGroupArchiveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Guruhlar Arxivi</h3>
                <p className="text-sm text-amber-100 mt-1">Arxivlangan guruhlar yaratilgan sana bilan</p>
              </div>
              <button onClick={() => setIsGroupArchiveModalOpen(false)} className="p-2 rounded-full hover:bg-white/20">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div className="p-8">
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Guruh</th>
                      <th className={thClass}>Yaratilgan sana</th>
                      <th className={thClass}>Status</th>
                      <th className={`${thClass} text-right`}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {archivedGroups.map((g: Group) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className={`${tdClass} font-bold text-slate-900`}>{g.name}</td>
                        <td className={`${tdClass} text-slate-600`}>{formatDateUz(g.createdAt)}</td>
                        <td className={tdClass}><span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-black uppercase">Arxiv</span></td>
                        <td className={`${tdClass} text-right space-x-2`}>
                          <button
                            onClick={() => { setIsGroupArchiveModalOpen(false); setSelectedGroupId(g.id); }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs"
                          >
                            A'zolar
                          </button>
                          <button
                            onClick={() => handleExportGroupMembers(g.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 font-bold text-xs"
                          >
                            <Download className="w-4 h-4" /> Excel
                          </button>
                          <button onClick={() => handleRestoreGroup(g.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                            <ArchiveRestore className="w-4 h-4" /> Qaytarish
                          </button>
                        </td>
                      </tr>
                    ))}
                    {archivedGroups.length === 0 && (
                      <tr>
                        <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>Arxiv hozircha bo'sh.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'site-settings' && (
        <div className="animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 lg:p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900">Sayt sozlamalari</h3>
              <p className="mt-2 text-sm text-slate-500">
                Login oynasi va admin/student kabinetlari sidebar qismidagi branding logolarini shu yerdan boshqaring.
              </p>
            </div>

            <form onSubmit={handleSaveSiteSettings} className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="xl:col-span-2 rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6">
                <div className="mb-5">
                  <p className="text-lg font-black text-slate-900">Sayt nomi</p>
                  <p className="text-sm text-slate-500">Sidebar va login oynasidagi matnlarni shu yerdan o'zgartiring.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Sayt nomi"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
                    value={siteSettingsForm.siteTitle || ''}
                    onChange={(e) => setSiteSettingsForm((prev) => ({ ...prev, siteTitle: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Pastki subtitle"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
                    value={siteSettingsForm.siteSubtitle || ''}
                    onChange={(e) => setSiteSettingsForm((prev) => ({ ...prev, siteSubtitle: e.target.value }))}
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Demo urinishlar limiti"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
                    value={siteSettingsForm.demoMaxAttempts || 1}
                    onChange={(e) => setSiteSettingsForm((prev) => ({ ...prev, demoMaxAttempts: Math.max(1, Number(e.target.value || 1)) }))}
                  />
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Demo test moduli bo'yicha bitta foydalanuvchi nechta marta qayta yecha olishini belgilaydi.
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900">Login oynasi logosi</p>
                    <p className="text-sm text-slate-500">Login sahifasining yuqori qismida ko'rinadi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loginLogoInputRef.current?.click()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                  >
                    Fayl tanlash
                  </button>
                </div>
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-center">
                  {siteSettingsForm.loginLogo ? (
                    <img src={siteSettingsForm.loginLogo} alt="Login logo preview" className="mx-auto h-28 w-28 object-contain" />
                  ) : (
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                      Logo
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSiteSettingsForm((prev) => ({ ...prev, loginLogo: '' }));
                    setLoginLogoFile(null);
                    setClearLoginLogo(true);
                  }}
                  className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600"
                >
                  Login logosini tozalash
                </button>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900">Kabinet sidebar logosi</p>
                    <p className="text-sm text-slate-500">Admin va student sidebaridagi ART EDU yozuvi chapida ko'rinadi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sidebarLogoInputRef.current?.click()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                  >
                    Fayl tanlash
                  </button>
                </div>
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-[#1a1a1a] p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2">
                      {siteSettingsForm.sidebarLogo ? (
                        <img src={siteSettingsForm.sidebarLogo} alt="Sidebar logo preview" className="h-12 w-12 object-contain" />
                      ) : (
                        <span className="text-xs font-black text-slate-400">Logo</span>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">{siteSettingsForm.siteTitle || 'ART EDU'}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{siteSettingsForm.siteSubtitle || 'Test Platform'}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSiteSettingsForm((prev) => ({ ...prev, sidebarLogo: '' }));
                    setSidebarLogoFile(null);
                    setClearSidebarLogo(true);
                  }}
                  className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600"
                >
                  Sidebar logosini tozalash
                </button>
              </div>

              <div className="xl:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-6 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100"
                >
                  Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSiteSettingsForm((prev) => ({ ...prev, loginLogo: '', sidebarLogo: '' }));
                    setLoginLogoFile(null);
                    setSidebarLogoFile(null);
                    setClearLoginLogo(true);
                    setClearSidebarLogo(true);
                  }}
                  className="rounded-2xl bg-slate-100 px-6 py-4 font-black uppercase tracking-widest text-slate-600"
                >
                  Tozalash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Foydalanuvchilar Bazasi</h3>
                <p className="mt-1 text-sm text-slate-500">Faol foydalanuvchilar ro'yxati, filtr va arxivlash boshqaruvi.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="/Foydalanuvchilar_shablon.xlsx" download className="bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-sm hover:bg-slate-200 transition-colors"><Download className="w-5 h-5" /> Shablon</a>
                <button onClick={() => userExcelInputRef.current?.click()} className="bg-green-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-colors"><Upload className="w-5 h-5" /> Excel Import</button>
                <button onClick={() => { setEditingId(null); setUserForm({fullName:'', username:'', password:'', workplace:'', role: UserRole.PARTICIPANT, groupId:''}); setIsUserModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100"><Plus className="w-5 h-5" /> Yangi Foydalanuvchi</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
              <input
                value={userFilters.fullName}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="F.I.SH bo'yicha filtr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <input
                value={userFilters.username}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Login bo'yicha filtr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <input
                value={userFilters.workplace}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, workplace: e.target.value }))}
                placeholder="Ish joyi bo'yicha filtr"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              />
              <select
                value={userFilters.groupId}
                onChange={(e) => setUserFilters((prev) => ({ ...prev, groupId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              >
                <option value="">Barcha guruhlar</option>
                {activeGroups.map((group: Group) => (
                  <option key={group.id} value={String(group.id)}>{group.name}</option>
                ))}
              </select>
            </div>

            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>F.I.SH</th>
                    <th className={thClass}>Login</th>
                    <th className={thClass}>Asosiy ish joyi</th>
                    <th className={thClass}>Parol</th>
                    <th className={thClass}>Rol</th>
                    <th className={thClass}>Guruh</th>
                    <th className={`${thClass} text-right`}>Amallar</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredUsers.map((u: User) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} text-slate-900 font-bold`}>{u.fullName}</td>
                      <td className={`${tdClass} text-slate-600 font-mono`}>{u.username}</td>
                      <td className={`${tdClass} text-slate-600`}>{u.workplace || '—'}</td>
                      <td className={`${tdClass} text-slate-500`}>{u.password || '—'}</td>
                      <td className={tdClass}>
                        <span className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role === UserRole.PARTICIPANT ? 'TINGLOVCHI' : u.role}
                        </span>
                      </td>
                      <td className={`${tdClass} text-slate-600`}>
                        {(data.groups || []).find((g: Group) => String(g.id) === String(u.groupId))?.name || '—'}
                      </td>
                      <td className={`${tdClass} text-right space-x-1`}>
                        <button onClick={() => { setEditingId(String(u.id)); setUserForm({ fullName: u.fullName, username: u.username, password: u.password || '', workplace: u.workplace || '', role: u.role, groupId: String(u.groupId || '') }); setIsUserModalOpen(true); }} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleArchiveUser(u)} className="p-2 text-amber-500 hover:text-amber-700" title="Arxivlash"><Archive className="w-5 h-5" /></button>
                        <button onClick={async () => { if(confirm("O'chirilsinmi?")) await runAdminMutation(() => deleteUser(u.id), "Foydalanuvchi o'chirildi."); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                        Filtrga mos foydalanuvchi topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Archive className="w-5 h-5 text-indigo-500" />
              <h4 className="text-xl font-black text-slate-900">Foydalanuvchilar arxiv papkalari</h4>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
              <div className="space-y-3">
                {archivedUserFolders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Hozircha arxivlangan foydalanuvchilar mavjud emas.
                  </div>
                )}
                {archivedUserFolders.map((folder) => (
                  <button
                    key={String(folder.id)}
                    type="button"
                    onClick={() => setOpenedArchivedUserFolderId(folder.id)}
                    className={`w-full rounded-[1.5rem] border p-5 text-left transition-all ${
                      String(openedArchivedUserFolderId) === String(folder.id)
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{folder.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Tarkib: {folder.users.length} ta foydalanuvchi
                        </p>
                      </div>
                      <List className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/50 p-5">
                {openedArchivedUserFolder ? (
                  <>
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-slate-900">{openedArchivedUserFolder.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Papka tarkibi: {openedArchivedUserFolder.users.length} ta foydalanuvchi
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenedArchivedUserFolderId(null)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Orqaga
                      </button>
                    </div>
                    <div className={tableWrapClass}>
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={thClass}>F.I.SH</th>
                            <th className={thClass}>Login</th>
                            <th className={thClass}>Asosiy ish joyi</th>
                            <th className={thClass}>Rol</th>
                            <th className={`${thClass} text-right`}>Amallar</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {openedArchivedUserFolder.users.map((u: User) => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className={`${tdClass} text-slate-900 font-bold`}>{u.fullName}</td>
                              <td className={`${tdClass} text-slate-600 font-mono`}>{u.username}</td>
                              <td className={`${tdClass} text-slate-600`}>{u.workplace || '—'}</td>
                              <td className={tdClass}>
                                <span className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {u.role === UserRole.PARTICIPANT ? 'TINGLOVCHI' : u.role}
                                </span>
                              </td>
                              <td className={`${tdClass} text-right`}>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreUser(u)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                                >
                                  <ArchiveRestore className="w-4 h-4" /> Qaytarish
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                    Chap tomondan guruh papkasini tanlang, shunda ichidagi arxivlangan foydalanuvchilar ro'yxati shu yerda ko'rinadi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TESTS TAB */}
      {isTestsTab && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-3 flex justify-between items-center mb-4">
            <h3 className="text-2xl font-black text-gray-800">{isDemoTab ? 'Demo Test Modullari Sozlamalari' : 'Test Modullari Sozlamalari'}</h3>
            <button onClick={() => { setEditingId(null); setTestForm(DEFAULT_TEST_FORM); setIsTestModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-100"><Plus className="w-5 h-5" /> Yangi Test Moduli</button>
          </div>
          {currentModules.map((m: Module) => (
            <div key={m.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full">
              <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${m.settings.isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                <Power className="w-3.5 h-3.5" /> {m.settings.isActive ? 'AKTIV' : 'NOAKTIV'}
              </div>

              <div className="flex justify-between items-start mb-6 pt-4">
                <div className={`p-4 rounded-2xl ${m.settings.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                  <Settings className="w-8 h-8" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setEditingId(m.id); setTestForm({...m}); setIsTestModalOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={async () => { if(confirm("Ushbu test moduli o'chirilsinmi?")) await runAdminMutation(() => deleteModule(m.id), "Test moduli o'chirildi."); }} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <h4 className="text-2xl font-black text-gray-900 mb-6 line-clamp-2 leading-tight">{m.name}</h4>
              
              <div className="mt-auto space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Vaqt:</span>
                  </div>
                  <span className="text-sm font-black text-indigo-600">{m.settings.durationMinutes} daqiqa</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Target className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Ball / Savol:</span>
                  </div>
                  <span className="text-sm font-black text-indigo-600">{m.settings.pointsPerAnswer} ball</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Award className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">O'tish balli:</span>
                  </div>
                  <span className="text-sm font-black text-indigo-600">{m.settings.passingScore} ball</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TEST MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Natijalarni arxivlash</h3>
                <p className="mt-1 text-sm text-slate-500">Papka yarating yoki tanlangan natijalarni mavjud papkaga yuklang.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedResultIds(
                      selectedResultIds.length === filteredResults.length
                        ? []
                        : filteredResults.map((result: TestResult) => result.id)
                    )}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
                  >
                    {selectedResultIds.length === filteredResults.length && filteredResults.length > 0 ? 'Belgilashni bekor qilish' : 'Ko‘rinayotganlarni belgilash'}
                  </button>
                  <span className="text-sm font-bold text-slate-600">
                    Tanlangan natijalar: {selectedResultIds.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 mb-5">
                  <input
                    value={archiveFolderName}
                    onChange={(e) => setArchiveFolderName(e.target.value)}
                    placeholder="Yangi arxiv papka nomi"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateArchiveFolder}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white"
                  >
                    Papka yaratish
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white">
                  <table className="w-full text-left min-w-[620px]">
                    <thead>
                      <tr>
                        <th className={`${thClass} w-14 text-center`}>
                          <input
                            type="checkbox"
                            checked={filteredResults.length > 0 && selectedResultIds.length === filteredResults.length}
                            onChange={(e) => setSelectedResultIds(e.target.checked ? filteredResults.map((r: TestResult) => r.id) : [])}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </th>
                        <th className={thClass}>Tinglovchi</th>
                        <th className={thClass}>Guruh</th>
                        <th className={`${thClass} text-center`}>Sana</th>
                        <th className={`${thClass} text-center`}>Ball</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((r: TestResult) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className={`${tdClass} text-center`}>
                            <input
                              type="checkbox"
                              checked={selectedResultIds.includes(r.id)}
                              onChange={(e) => setSelectedResultIds((prev) => e.target.checked ? [...prev, r.id] : prev.filter((id) => String(id) !== String(r.id)))}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                          <td className={`${tdClass} font-bold text-slate-900`}>{getParticipantName(r.participantId)}</td>
                          <td className={`${tdClass} text-slate-600`}>{getParticipantGroupName(r.participantId)}</td>
                          <td className={`${tdClass} text-center text-slate-500`}>{formatDateUz(r.date)}</td>
                          <td className={`${tdClass} text-center text-indigo-700 font-black`}>{r.score}</td>
                        </tr>
                      ))}
                      {filteredResults.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                            Arxivlash uchun filtrga mos natija topilmadi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="w-5 h-5 text-indigo-500" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-600">Mavjud arxiv papkalari</p>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {resultArchiveFolders.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      Hozircha arxiv papka yaratilmagan.
                    </div>
                  )}
                  {resultArchiveFolders.map((folder) => (
                    <div key={folder.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{folder.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {folder.resultsCount} ta natija • {formatDateUz(folder.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleArchiveSelectedResults(folder.id)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white"
                        >
                          Yuklash
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST MODAL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl border-4 border-indigo-100 max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 z-10 px-8 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black">
                {editingId
                  ? (isDemoTab ? 'Demo Test Modulini Tahrirlash' : 'Test Modulini Tahrirlash')
                  : (isDemoTab ? 'Yangi Demo Test Moduli' : 'Yangi Test Moduli')}
              </h3>
              <button onClick={() => setIsTestModalOpen(false)} className="p-2 rounded-full hover:bg-white/20 transition-all"><X className="w-7 h-7" /></button>
            </div>
            
            <form onSubmit={handleSaveTest} className="p-6 space-y-6">
              <div className="space-y-2 rounded-xl border-2 border-blue-200 p-4 bg-blue-50/40">
                <label className="text-xs font-black uppercase text-slate-500">Test moduli nomi</label>
                <input
                  type="text"
                  placeholder="Masalan: Rangtasvir yakuniy testi"
                  required
                  className="w-full px-5 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                  value={testForm.name}
                  onChange={e => setTestForm({...testForm, name: e.target.value})}
                />
              </div>

              <div className="rounded-xl border-2 border-emerald-200 p-4 bg-emerald-50/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">Test holati</p>
                  <p className="text-sm font-bold text-slate-700">{testForm.settings.isActive ? 'Aktiv' : 'Noaktiv'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestForm({...testForm, settings: {...testForm.settings, isActive: !testForm.settings.isActive}})}
                  className={`w-16 h-8 rounded-full transition-all relative ${testForm.settings.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${testForm.settings.isActive ? 'left-9' : 'left-1'}`} />
                </button>
              </div>

              <div className="rounded-xl border-2 border-indigo-200 p-4 bg-white">
                <p className="text-xs font-black uppercase text-slate-500 mb-4">Test fanlarini tanlang va savollar sonini kiriting</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentSubjects.map((subject: Subject) => {
                    const cfg = testForm.subjectConfigs.find((item: any) => item.subjectId === subject.id);
                    const checked = Boolean(cfg);
                    return (
                      <div key={subject.id} className={`p-4 rounded-xl border ${checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleSubjectInTestForm(subject.id)} className="w-4 h-4" />
                            <span className="font-bold text-slate-800">{subject.name}</span>
                          </label>
                          {checked && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-500 uppercase">Savol soni</span>
                              <input
                                type="number"
                                min={1}
                                className="w-24 px-3 py-2 rounded-lg border border-indigo-200 bg-white text-center font-bold"
                                value={cfg?.questionCount || 1}
                                onChange={(e) => updateSubjectQuestionCount(subject.id, parseInt(e.target.value) || 1)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {currentSubjects.length === 0 && <p className="text-sm text-slate-500">Avval fan yarating.</p>}
                </div>
              </div>

              {isDemoTab && (
                <div className="rounded-xl border-2 border-amber-200 p-4 bg-amber-50/40">
                  <p className="text-xs font-black uppercase text-slate-500 mb-4">Qaysi kurs (guruh)lar uchun demo test ochiq</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeGroups.map((group: Group) => {
                      const selected = (testForm.groupIds || []).includes(group.id);
                      return (
                        <label key={group.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${selected ? 'bg-white border-amber-300' : 'bg-white/70 border-amber-100'}`}>
                          <span className="font-bold text-slate-800">{group.name}</span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const next = selected
                                ? (testForm.groupIds || []).filter((id) => id !== group.id)
                                : [...(testForm.groupIds || []), group.id];
                              setTestForm({ ...testForm, groupIds: next });
                            }}
                            className="w-4 h-4"
                          />
                        </label>
                      );
                    })}
                    {activeGroups.length === 0 && <p className="text-sm text-slate-500">Avval aktiv guruh yarating.</p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2 rounded-xl border-2 border-sky-200 p-3 bg-sky-50/40">
                  <label className="text-xs font-black uppercase text-slate-500">Berilgan vaqt (daqiqa)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-4 py-4 bg-slate-50 rounded-xl font-bold outline-none border border-transparent focus:border-indigo-500"
                    value={testForm.settings.durationMinutes}
                    onChange={e => setTestForm({...testForm, settings: {...testForm.settings, durationMinutes: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <div className="space-y-2 rounded-xl border-2 border-violet-200 p-3 bg-violet-50/40">
                  <label className="text-xs font-black uppercase text-slate-500">To'g'ri javob balli</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-4 py-4 bg-slate-50 rounded-xl font-bold outline-none border border-transparent focus:border-indigo-500"
                    value={testForm.settings.pointsPerAnswer}
                    onChange={e => setTestForm({...testForm, settings: {...testForm.settings, pointsPerAnswer: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <div className="space-y-2 rounded-xl border-2 border-amber-200 p-3 bg-amber-50/40">
                  <label className="text-xs font-black uppercase text-slate-500">O'tish (minimal) ball</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-4 py-4 bg-slate-50 rounded-xl font-bold outline-none border border-transparent focus:border-indigo-500"
                    value={testForm.settings.passingScore}
                    onChange={e => setTestForm({...testForm, settings: {...testForm.settings, passingScore: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsTestModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase">Bekor qilish</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg uppercase hover:bg-indigo-700 transition-colors">Testni saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTHER MODALS */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"><h3 className="text-2xl font-black mb-8 text-gray-900">{editingId ? 'Tahrirlash' : (isDemoTab ? 'Yangi Demo Fan' : 'Yangi Fan')}</h3><form onSubmit={handleSaveSubject} className="space-y-6"><input type="text" placeholder="Fan nomi" required className="w-full px-8 py-5 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500" value={subjectForm.name} onChange={e => setSubjectForm({name: e.target.value})} /><div className="flex gap-4 pt-4"><button type="button" onClick={() => setIsSubjectModalOpen(false)} className="flex-1 py-5 font-black text-gray-400 uppercase">Yopish</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg uppercase">Saqlash</button></div></form></div></div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black mb-6 text-gray-900">Guruh Sozlamalari</h3>
            <form onSubmit={handleSaveGroup} className="space-y-6">
              <input
                type="text"
                placeholder="Guruh nomi"
                required
                className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500"
                value={groupForm.name}
                onChange={e => setGroupForm({...groupForm, name: e.target.value})}
              />

              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Test modullarini biriktirish</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(data.modules || []).map((module: Module) => {
                    const selected = (groupForm.moduleIds || []).includes(module.id);
                    return (
                      <label key={module.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${selected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`}>
                        <div>
                          <p className="font-bold text-slate-900">{module.name}</p>
                          <p className="text-xs text-slate-500">{module.settings.durationMinutes} daqiqa</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const next = selected
                              ? (groupForm.moduleIds || []).filter((id) => id !== module.id)
                              : [...(groupForm.moduleIds || []), module.id];
                            setGroupForm({...groupForm, moduleIds: next});
                          }}
                          className="w-4 h-4"
                        />
                      </label>
                    );
                  })}
                  {(data.modules || []).length === 0 && (
                    <p className="text-sm text-slate-500">Avval test moduli yarating.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="flex-1 py-4 font-black text-gray-400 uppercase">Bekor qilish</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg uppercase">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black">Foydalanuvchi Ma'lumotlari</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 rounded-full hover:bg-white/20">
                <X className="w-7 h-7" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-4">
              <input
                type="text"
                placeholder="F.I.SH"
                required
                className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                value={userForm.fullName}
                onChange={e => setUserForm({...userForm, fullName: e.target.value})}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Login"
                  required
                  className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                  value={userForm.username}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Parol"
                  required={!editingId}
                  className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                />
              </div>
              <input
                type="text"
                placeholder="Asosiy ish joyi"
                className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                value={userForm.workplace}
                onChange={e => setUserForm({...userForm, workplace: e.target.value})}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.PARTICIPANT}>TINGLOVCHI</option>
                  <option value={UserRole.ADMIN}>ADMIN</option>
                </select>
                <select
                  className="w-full px-6 py-4 bg-slate-50 rounded-xl font-semibold outline-none border border-transparent focus:border-indigo-500"
                  value={userForm.groupId}
                  onChange={e => setUserForm({...userForm, groupId: e.target.value})}
                >
                  <option value="">Guruh biriktirilmagan</option>
                  {activeGroups.map((group: Group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 font-black text-slate-400">BEKOR QILISH</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg">SAQLASH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"><h3 className="text-2xl font-black mb-8 text-gray-900">{isDemoTab ? 'Demo Savol Qo\'shish' : 'Savol Qo\'shish'}</h3><form onSubmit={handleSaveQuestion} className="space-y-6"><textarea placeholder="Savol matni..." required className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black outline-none border-2 border-transparent focus:border-indigo-500 min-h-[150px]" value={questionForm.text} onChange={e => setQuestionForm({...questionForm, text: e.target.value})} /><div className="space-y-4">{questionForm.options.map((opt, i) => (<div key={i} className="flex items-center gap-4"><button type="button" onClick={() => setQuestionForm({...questionForm, correctIndex: i})} className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all ${questionForm.correctIndex === i ? 'bg-[#3edc81] text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{String.fromCharCode(65+i)}</button><input type="text" placeholder={`Variant ${String.fromCharCode(65+i)}`} required className="flex-1 px-6 py-5 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-500" value={opt} onChange={e => { const n = [...questionForm.options]; n[i] = e.target.value; setQuestionForm({...questionForm, options: n}); }} /></div>))}</div><div className="flex gap-4 pt-10"><button type="button" onClick={() => setIsQuestionModalOpen(false)} className="flex-1 py-6 font-black text-gray-400 uppercase">Yopish</button><button type="submit" className="flex-1 py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl uppercase transition-all">Saqlash</button></div></form></div></div>
      )}

      {isAddUsersToGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-gray-900">Tinglovchi Biriktirish</h3><button onClick={() => setIsAddUsersToGroupModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-8 h-8 text-gray-400" /></button></div>
            <div className="relative mb-6"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Ism yoki login..." className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} /></div>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const availableIds = (data.users || [])
                    .filter((u:any) =>
                      u.role === UserRole.PARTICIPANT &&
                      !u.groupId &&
                      (`${u.fullName} ${u.username}`.toLowerCase().includes(userSearchTerm.toLowerCase()))
                    )
                    .map((u:any) => u.id);
                  setSelectedUserIds(availableIds);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase"
              >
                Barchasini tanlash
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase"
              >
                Tozalash
              </button>
            </div>
            <div className="max-h-[350px] overflow-y-auto space-y-2 no-scrollbar p-1">
              {(data.users || []).filter((u:any) => u.role === UserRole.PARTICIPANT && !u.groupId && (`${u.fullName} ${u.username}`).toLowerCase().includes(userSearchTerm.toLowerCase())).map((u:any) => (
                <div key={u.id} onClick={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${selectedUserIds.includes(u.id) ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-100' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                  {selectedUserIds.includes(u.id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6 text-gray-300" />}
                  <div><p className="font-black text-gray-900 leading-none">{u.fullName}</p><p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">@{u.username}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex gap-4"><button onClick={() => setIsAddUsersToGroupModalOpen(false)} className="flex-1 py-5 font-black text-gray-400 uppercase tracking-widest">Yopish</button><button onClick={handleBulkGroupAssign} disabled={selectedUserIds.length === 0} className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest transition-all">Biriktirish ({selectedUserIds.length})</button></div>
          </div>
        </div>
      )}

      <input type="file" ref={questionExcelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleQuestionExcelImport} />
      <input type="file" ref={userExcelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleUserExcelImport} />
      <input type="file" ref={loginLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleSiteLogoChange('loginLogo', e)} />
      <input type="file" ref={sidebarLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleSiteLogoChange('sidebarLogo', e)} />
    </div>
  );
};

export default AdminDashboard;
