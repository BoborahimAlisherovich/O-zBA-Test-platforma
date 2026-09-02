
import React, { useState, useEffect, useRef } from 'react';
import { User, Module, Question, TestAttempt, TestResult, Group, SiteSettings } from '../types';
import { saveTestProgress, startTestSession, submitTest } from '../api';
import { 
  Clock, CheckCircle2, AlertCircle, Award, History, 
  ArrowRight, Layers, CheckCircle, HelpCircle, 
  XCircle, Timer, LogOut, Sparkles, BookOpen, ChevronRight, Zap, User as UserIcon
} from 'lucide-react';

interface ParticipantDashboardProps {
  user: User;
  data: any;
  updateData: (newData: any) => Promise<void>;
  reloadData: () => Promise<void>;
}

const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({ user, data, updateData, reloadData }) => {
  const BRAND_LOGO_URL = "/logo.png";
  const BRAND_LOGO_FALLBACK_URL = "https://raw.githubusercontent.com/ai-gen-images/assets/main/logo_badiiy.png";
  const demoMaxAttempts = Math.max(1, Number(data.siteSettings?.demoMaxAttempts || 5));
  const [activeTest, setActiveTest] = useState<Module | null>(null);
  const [activeTestType, setActiveTestType] = useState<'main' | 'demo'>('main');
  const [activeAttemptId, setActiveAttemptId] = useState<string | number | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState<TestResult | null>(null);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [isMainTestsModalOpen, setIsMainTestsModalOpen] = useState(false);
  const [isDemoTestsModalOpen, setIsDemoTestsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'offline' | 'error'>('idle');
  const [captureWarning, setCaptureWarning] = useState('');
  const [privacyShieldActive, setPrivacyShieldActive] = useState(false);
  const timerRef = useRef<any>(null);
  const syncTimeoutRef = useRef<any>(null);
  const captureWarningTimeoutRef = useRef<any>(null);
  const pendingProgressRef = useRef<{ attemptId: string | number; answers: Record<string, number>; currentQuestionIndex: number; timeRemaining: number } | null>(null);
  const lastQueuedSignatureRef = useRef('');
  const lastSyncedSignatureRef = useRef('');
  const branding: SiteSettings = data.siteSettings || {};
  const sidebarLogoSrc = branding.sidebarLogo || BRAND_LOGO_URL;
  const siteTitle = branding.siteTitle || 'ART EDU';
  const siteSubtitle = branding.siteSubtitle || 'Test Platform';
  const participantGroup = (data.groups || []).find((g: Group) => String(g.id) === String(user.groupId));
  const assignedModuleIds = participantGroup?.moduleIds || [];
  const attemptCacheKey = `artedu_test_attempts_${user.id}`;

  const readAttemptCache = () => {
    try {
      const raw = localStorage.getItem(attemptCacheKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeAttemptCacheEntry = (attempt: any) => {
    const cache = readAttemptCache();
    cache[String(attempt.id)] = { ...attempt, cachedAt: new Date().toISOString() };
    localStorage.setItem(attemptCacheKey, JSON.stringify(cache));
  };

  const removeAttemptCacheEntry = (attemptId?: string | number | null) => {
    if (!attemptId) return;
    const cache = readAttemptCache();
    delete cache[String(attemptId)];
    localStorage.setItem(attemptCacheKey, JSON.stringify(cache));
  };

  const clearAttemptCache = () => {
    localStorage.removeItem(attemptCacheKey);
  };

  const applyAttemptToState = (attempt: TestAttempt) => {
    const moduleCollection = attempt.isDemo ? (data.demoModules || []) : (data.modules || []);
    const matchedModule = moduleCollection.find((item: Module) => String(item.id) === String(attempt.moduleId));
    const fallbackModule: Module = {
      id: attempt.moduleId,
      name: attempt.moduleName,
      groupIds: [],
      subjectConfigs: [],
      settings: attempt.settings,
    };
    setActiveAttemptId(attempt.id);
    setActiveTest(matchedModule || fallbackModule);
    setActiveTestType(attempt.isDemo ? 'demo' : 'main');
    setCurrentQuestions(attempt.questions || []);
    setCurrentQuestionIndex(attempt.currentQuestionIndex || 0);
    setAnswers(attempt.answers || {});
    setStartTime(new Date(attempt.startedAt).getTime());
    setTimeLeft(Math.max(0, attempt.timeRemaining || 0));
    setSyncState('idle');
    const currentSignature = JSON.stringify({
      attemptId: attempt.id,
      answers: attempt.answers || {},
      currentQuestionIndex: attempt.currentQuestionIndex || 0,
    });
    lastQueuedSignatureRef.current = currentSignature;
    lastSyncedSignatureRef.current = currentSignature;
    writeAttemptCacheEntry(attempt);
  };

  const showCaptureWarning = (message: string) => {
    setCaptureWarning(message);
    if (captureWarningTimeoutRef.current) clearTimeout(captureWarningTimeoutRef.current);
    captureWarningTimeoutRef.current = setTimeout(() => setCaptureWarning(''), 2500);
  };

  const syncProgressNow = async () => {
    if (!pendingProgressRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline');
      return;
    }

    const payload = pendingProgressRef.current;
    const payloadSignature = JSON.stringify(payload);
    if (payloadSignature === lastSyncedSignatureRef.current) {
      pendingProgressRef.current = null;
      setSyncState('idle');
      return;
    }
    pendingProgressRef.current = null;
    setSyncState('saving');
    try {
      const serverAttempt = await saveTestProgress(payload);
      lastSyncedSignatureRef.current = payloadSignature;
      writeAttemptCacheEntry(serverAttempt);
      setSyncState('idle');
    } catch (err: any) {
      pendingProgressRef.current = payload;
      const message = String(err?.message || '').toLowerCase();
      if (message.includes('failed to fetch') || message.includes('network') || message.includes('load failed')) {
        setSyncState('offline');
        return;
      }
      if (message.includes('vaqti tugagan')) {
        setSyncState('error');
        alert("Test vaqti tugagan. Natija saqlanmoqda.");
        return;
      }
      setSyncState('error');
    }
  };

  const scheduleProgressSync = (nextAnswers: Record<string, number>, nextQuestionIndex: number, nextTimeRemaining: number = timeLeft) => {
    if (!activeAttemptId || !activeTest) return;
    const cacheEntry: any = {
      id: activeAttemptId,
      moduleId: activeTest.id,
      moduleName: activeTest.name,
      isDemo: activeTestType === 'demo',
      questions: currentQuestions,
      answers: nextAnswers,
      currentQuestionIndex: nextQuestionIndex,
      startedAt: new Date(startTime).toISOString(),
      expiresAt: new Date().toISOString(),
      timeRemaining: Math.max(0, nextTimeRemaining),
      settings: activeTest.settings,
    };
    writeAttemptCacheEntry(cacheEntry);
    const nextPayload = {
      attemptId: activeAttemptId,
      answers: nextAnswers,
      currentQuestionIndex: nextQuestionIndex,
      timeRemaining: Math.max(0, nextTimeRemaining),
    };
    const nextSignature = JSON.stringify(nextPayload);
    if (nextSignature === lastQueuedSignatureRef.current || nextSignature === lastSyncedSignatureRef.current) {
      return;
    }
    lastQueuedSignatureRef.current = nextSignature;
    pendingProgressRef.current = nextPayload;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncProgressNow();
    }, 900);
  };

  // Participant uchun ochiq testlarni aniqlash
  const availableTests = (data.modules || []).filter((m: Module) => 
    m.settings.isActive && (
      assignedModuleIds.includes(m.id) ||
      m.groupIds.includes(user.groupId || '')
    )
  );

  const availableDemoTests = (data.demoModules || []).filter((m: Module) =>
    m.settings.isActive &&
    (m.groupIds || []).includes(user.groupId || '')
  );

  const startTest = async (test: Module, type: 'main' | 'demo' = 'main') => {
    if (type === 'demo') {
      const attempts = (data.demoResults || []).filter((r: any) => r.participantId === user.id && r.moduleId === test.id);
      if (attempts.length >= demoMaxAttempts) {
        alert("Sizda limit tugadi");
        return;
      }
    }
    try {
      const attempt = await startTestSession(test.id);
      applyAttemptToState(attempt);
    } catch (err: any) {
      alert(err?.message || "Testni boshlashda xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (activeTest) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const nextValue = Math.max(0, prev - 1);
          if (nextValue <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            window.setTimeout(() => completeTest(), 0);
          }
          return nextValue;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTest, activeAttemptId]);

  useEffect(() => {
    const cache = readAttemptCache();
    const activeCachedAttempt = Object.values(cache).find((attempt: any) => attempt.timeRemaining > 0 && !attempt.isPassed);
    if (activeCachedAttempt) {
      applyAttemptToState(activeCachedAttempt as any);
    }
  }, [user.id]);

  useEffect(() => {
    const handleOnline = () => {
      if (pendingProgressRef.current) {
        syncProgressNow();
      } else {
        setSyncState('idle');
      }
    };
    const handleOffline = () => setSyncState('offline');
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingProgressRef.current) {
        syncProgressNow();
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAttemptId, activeTest]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (captureWarningTimeoutRef.current) clearTimeout(captureWarningTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeTest) return;

    const handleContextMenu = (event: Event) => event.preventDefault();
    const handleCopyLike = (event: Event) => {
      event.preventDefault();
      showCaptureWarning("Test sahifasida nusxa olish va saqlash cheklangan.");
    };
    const handleKeyDown = async (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCombo =
        event.key === 'PrintScreen' ||
        key === 'f12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c', 's'].includes(key)) ||
        (event.ctrlKey && ['u', 'p', 's', 'c'].includes(key));

      if (!blockedCombo) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'PrintScreen' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText('');
        } catch {}
      }
      showCaptureWarning("Skrinshot va kontentni ko'chirish test vaqtida cheklangan.");
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyLike);
    window.addEventListener('cut', handleCopyLike);
    window.addEventListener('paste', handleCopyLike);
    window.addEventListener('dragstart', handleCopyLike);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyLike);
      window.removeEventListener('cut', handleCopyLike);
      window.removeEventListener('paste', handleCopyLike);
      window.removeEventListener('dragstart', handleCopyLike);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeTest]);

  useEffect(() => {
    if (!activeAttemptId || !activeTest) return;

    const persistPausedState = () => {
      scheduleProgressSync(answers, currentQuestionIndex, timeLeft);
    };

    window.addEventListener('beforeunload', persistPausedState);
    window.addEventListener('pagehide', persistPausedState);

    return () => {
      window.removeEventListener('beforeunload', persistPausedState);
      window.removeEventListener('pagehide', persistPausedState);
    };
  }, [activeAttemptId, activeTest, answers, currentQuestionIndex, timeLeft]);

  useEffect(() => {
    if (!activeTest) {
      setPrivacyShieldActive(false);
      return;
    }

    const enableShield = (message: string) => {
      setPrivacyShieldActive(true);
      showCaptureWarning(message);
    };
    const disableShield = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        setPrivacyShieldActive(false);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        enableShield("Test oynasi faol bo'lmaganda kontent vaqtincha yashiriladi.");
        return;
      }
      disableShield();
    };
    const handleBlur = () => enableShield("Testdan chiqish yoki boshqa oynaga o'tish cheklangan.");
    const handleFocus = () => disableShield();
    const handleBeforePrint = () => {
      enableShield("Test sahifasini chop etish yoki PDF saqlash bloklandi.");
    };
    const handleAfterPrint = () => disableShield();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      setPrivacyShieldActive(false);
    };
  }, [activeTest]);

  const completeTest = async () => {
    if (!activeTest || !activeAttemptId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (pendingProgressRef.current) {
        await syncProgressNow();
      }
      const result = await submitTest({
        attemptId: activeAttemptId,
        moduleId: activeTest.id,
        answers,
        currentQuestionIndex,
        timeTaken: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
        timeRemaining: timeLeft,
      });

      const resultKey = activeTestType === 'demo' ? 'demoResults' : 'results';
      await updateData({ [resultKey]: [...(data[resultKey] || []), result] });
      setShowResult(result);
      removeAttemptCacheEntry(activeAttemptId);
      pendingProgressRef.current = null;
      setActiveAttemptId(null);
      setActiveTest(null);
      setActiveTestType('main');
      setCurrentQuestions([]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setSyncState('idle');
      lastQueuedSignatureRef.current = '';
      lastSyncedSignatureRef.current = '';
    } catch (err: any) {
      alert(err?.message || "Testni yakunlashda xatolik yuz berdi");
    }
  };

  const changeQuestionIndex = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(currentQuestions.length - 1, nextIndex));
    setCurrentQuestionIndex(boundedIndex);
    scheduleProgressSync(answers, boundedIndex, timeLeft);
  };

  const handleAnswerSelect = (questionId: string | number, optionIndex: number) => {
    const nextAnswers = { ...answers, [String(questionId)]: optionIndex };
    setAnswers(nextAnswers);
    scheduleProgressSync(nextAnswers, currentQuestionIndex, timeLeft);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const mainResults = (data.results || []).filter((r: TestResult) => String(r.participantId) === String(user.id));
  const demoResults = (data.demoResults || []).filter((r: TestResult) => String(r.participantId) === String(user.id));
  const passedMainResults = mainResults.filter((r: TestResult) => r.isPassed).length;
  const averageScore = mainResults.length
    ? Math.round(mainResults.reduce((sum: number, item: TestResult) => sum + Number(item.score || 0), 0) / mainResults.length)
    : 0;
  const latestMainResult = mainResults.length ? mainResults[0] : null;
  const latestDemoResult = demoResults.length ? demoResults[0] : null;
  const plannedMinutes = availableTests.reduce((sum: number, item: Module) => sum + Number(item.settings?.durationMinutes || 0), 0);
  const getQuestionCount = (test: Module) =>
    (test.subjectConfigs || []).reduce((sum, config) => sum + Number(config.questionCount || 0), 0);

  if (activeTest) {
    const answeredCount = currentQuestions.filter((q) => answers[q.id] !== undefined).length;
    const currentQuestion = currentQuestions[currentQuestionIndex];
    const progressPercent = currentQuestions.length > 0 ? ((currentQuestionIndex + 1) / currentQuestions.length) * 100 : 0;

    if (!currentQuestion) return null;

    return (
      <div className="mx-auto max-w-7xl select-none p-4 lg:p-6 animate-in fade-in duration-500">
        {captureWarning && (
          <div className="fixed right-6 top-6 z-[120] rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-2xl">
            {captureWarning}
          </div>
        )}
        {privacyShieldActive && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/92 p-8 text-center text-white backdrop-blur-md">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-rose-300">Himoyalangan rejim</p>
              <h3 className="mt-4 text-3xl font-black">Test kontenti vaqtincha yashirildi</h3>
              <p className="mt-4 text-base font-semibold leading-8 text-slate-200">
                Test yechish vaqtida oynani almashtirish, chop etish, saqlash va skrinshotga urinishlar cheklanadi.
                Oynaga qaytsangiz test davom etadi.
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-lg font-black text-emerald-500">Test</p>
              <h3 className="mt-2 text-sm font-black leading-6 text-slate-900">{activeTest.name}</h3>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                {activeTestType === 'demo' ? 'Demo test' : 'Asosiy test'}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-black text-emerald-500">Berilgan vaqt</p>
              <div className="mt-4 flex items-center gap-3 text-slate-700">
                <Timer className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-black tabular-nums">{formatTime(timeLeft)}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                  style={{ width: `${Math.max(10, progressPercent)}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">{answeredCount}/{currentQuestions.length} savol belgilangan</p>
              <p className="mt-2 text-[11px] font-bold text-slate-400">
                {syncState === 'saving' && "Jarayon saqlanmoqda..."}
                {syncState === 'offline' && "Internet yo'q. Qurilmada saqlandi."}
                {syncState === 'error' && "Saqlashda uzilish bo'ldi."}
                {syncState === 'idle' && "Jarayon saqlandi"}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-black text-emerald-500">Savollar</p>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {currentQuestions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => changeQuestionIndex(idx)}
                      className={`h-9 rounded-lg text-sm font-black transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 text-white shadow-md'
                          : isAnswered
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-black text-emerald-500">Test Yakunlash</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Barcha javoblarni tekshirib bo'lgach testni yakunlang.
              </p>
              <button
                onClick={() => setIsConfirmingFinish(true)}
                className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-600"
              >
                Testni yakunlash
              </button>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => changeQuestionIndex(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Orqaga
              </button>

              <div className="text-center">
                <p className="text-2xl font-black text-emerald-500">Savvol № {currentQuestionIndex + 1}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  {currentQuestions.length} ta savol
                </p>
              </div>

              <button
                onClick={() => changeQuestionIndex(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === currentQuestions.length - 1}
                className="inline-flex items-center justify-end gap-2 text-sm font-black text-slate-500 transition disabled:opacity-40"
              >
                Keyingisi
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-6">
              <div className="rounded-[1.5rem] bg-slate-50/70 p-6">
                <p className="text-base font-semibold leading-8 text-slate-700">
                  {currentQuestion.text}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {currentQuestion.options.map((opt, oIdx) => {
                  const selected = answers[currentQuestion.id] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleAnswerSelect(currentQuestion.id, oIdx)}
                      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                        selected
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selected ? 'border-emerald-500' : 'border-slate-300'
                      }`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      </span>
                      <span className={`text-sm font-semibold ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-slate-500">
                  {answers[currentQuestion.id] !== undefined ? "Javob belgilangan" : "Hali javob belgilanmagan"}
                </div>
                <div className="flex gap-3">
                  {currentQuestionIndex < currentQuestions.length - 1 ? (
                    <button
                      onClick={() => changeQuestionIndex(currentQuestionIndex + 1)}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      Keyingi savol
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingFinish(true)}
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-600"
                    >
                      Testni yakunlash
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {isConfirmingFinish && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-12 text-center shadow-2xl border border-gray-100">
              <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                <AlertCircle className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Ishonchingiz komilmi?</h3>
              <p className="text-gray-500 font-medium mb-10 leading-relaxed">Siz barcha savollarga javob berganingizga ishonch hosil qiling. Test natijalari qayta tiklanmaydi.</p>
              <div className="flex flex-col gap-4">
                <button onClick={completeTest} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest">HA, TUGATISH</button>
                <button onClick={() => setIsConfirmingFinish(false)} className="w-full py-5 text-gray-400 font-black hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest">DAVOM ETTIRISH</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-10 animate-in zoom-in-95 duration-700">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-gray-100 bg-white shadow-2xl sm:rounded-[3rem] lg:rounded-[4rem]">
           <div className={`h-4 w-full sm:h-5 lg:h-6 ${showResult.isPassed ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />
           <div className="p-8 text-center sm:p-10 lg:p-16">
              <div className="relative mb-6 inline-block sm:mb-8 lg:mb-10">
                {showResult.isPassed ? (
                  <>
                    <Award className="relative z-10 h-20 w-20 text-green-500 sm:h-24 sm:w-24 lg:h-28 lg:w-28" />
                    <Sparkles className="absolute -right-2 -top-2 h-6 w-6 animate-pulse text-yellow-400 sm:-right-3 sm:-top-3 sm:h-7 sm:w-7 lg:-right-4 lg:-top-4 lg:h-8 lg:w-8" />
                  </>
                ) : (
                  <XCircle className="relative z-10 h-20 w-20 text-red-500 sm:h-24 sm:w-24 lg:h-28 lg:w-28" />
                )}
              </div>
              
              <h2 className="mb-3 text-4xl font-black tracking-tighter text-gray-900 sm:mb-4 sm:text-5xl">
                {showResult.isPassed ? 'Muvaffaqiyatli' : 'Natija yetarli emas!'}
              </h2>
              <p className="mb-8 text-sm font-bold uppercase tracking-[0.3em] text-gray-400 sm:mb-10 lg:mb-12">
                Sizning test natijangiz tayyor
              </p>

              <div className="mb-8 grid grid-cols-2 gap-4 sm:mb-10 sm:gap-5 lg:mb-12 lg:gap-6">
                 <div className="rounded-[1.7rem] border border-gray-100 bg-gray-50 p-5 sm:rounded-[2rem] sm:p-6 lg:rounded-[2.5rem] lg:p-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">To'g'ri javob</p>
                    <p className="text-3xl font-black text-indigo-600 sm:text-4xl">{showResult.correctAnswers}</p>
                 </div>
                 <div className={`rounded-[1.7rem] p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-6 lg:rounded-[2.5rem] lg:p-8 ${showResult.isPassed ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}>
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-2">To'plangan ball</p>
                    <p className="text-3xl font-black sm:text-4xl">{showResult.score}</p>
                 </div>
              </div>

              <button 
                onClick={() => setShowResult(null)} 
                className="w-full rounded-[1.4rem] bg-gray-900 px-5 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-indigo-600 sm:rounded-[1.7rem] sm:py-6 lg:rounded-[2rem] lg:py-7"
              >
                ASOSIY SAHIFAGA QAYTISH
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-20 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-[linear-gradient(135deg,#f8fbff_0%,#f5f7ff_46%,#f7fcfb_100%)] p-6 shadow-[0_28px_80px_rgba(77,100,140,0.10)] lg:p-8">
        <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />

        <header className="relative mb-8">
          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_10px_30px_rgba(148,163,184,0.10)] backdrop-blur lg:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-200">
                {user.profilePhoto ? (
                  <>
                    <img
                      src={user.profilePhoto}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="hidden h-full w-full items-center justify-center">
                      <UserIcon className="h-8 w-8" />
                    </div>
                  </>
                ) : (
                  <UserIcon className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.45em] text-indigo-500">Xush kelibsiz</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Salom, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">{user.fullName}</span>!
                </h2>
                <p className="mt-5 max-w-3xl border-l-4 border-indigo-100 pl-5 text-lg font-medium italic leading-8 text-slate-400">
                  Platformada sizga biriktirilgan faol testlar ro'yxati bilan tanishing va kerakli bo'limni tanlang.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="relative mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_12px_30px_rgba(148,163,184,0.10)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-2xl font-black text-slate-950">Tezkor bo'limlar</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Kerakli test bo'limiga bir marta bosish orqali o'ting</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <button
                onClick={async () => {
                  await reloadData();
                  setIsMainTestsModalOpen(true);
                }}
                className="group rounded-[1.8rem] border border-indigo-100 bg-[linear-gradient(135deg,#ffffff_0%,#f7f8ff_100%)] p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                </div>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-indigo-500">Asosiy testlar</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{availableTests.length} ta test</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">Asosiy test modullarini ochish va natijalarni ko'rish.</p>
              </button>

              <button
                onClick={async () => {
                  await reloadData();
                  setIsDemoTestsModalOpen(true);
                }}
                className="group rounded-[1.8rem] border border-sky-100 bg-[linear-gradient(135deg,#ffffff_0%,#f4fbff_100%)] p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-100">
                    <Zap className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500" />
                </div>
                <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-sky-500">Demo testlar</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{availableDemoTests.length} ta test</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">Demo modullarni xavfsiz tarzda sinab ko'rish. Limit: {demoMaxAttempts} ta.</p>
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,#0f172a_0%,#172554_44%,#0f766e_100%)] p-6 text-white shadow-[0_24px_50px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300">Faollik sharhi</p>
            <h3 className="mt-4 text-3xl font-black leading-tight">Siz uchun eng muhim ko'rsatkichlar shu yerda</h3>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Oxirgi asosiy natija</p>
                <p className="mt-2 text-2xl font-black">{latestMainResult ? `${latestMainResult.score} ball` : "Hali yo'q"}</p>
              </div>
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Oxirgi demo natija</p>
                <p className="mt-2 text-2xl font-black">{latestDemoResult ? `${latestDemoResult.score} ball` : "Hali yo'q"}</p>
              </div>
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Tavsif</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-200">
                  Avval asosiy testlarni tekshiring, keyin kerak bo'lsa demo blok orqali qo'shimcha mashq qiling.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Asosiy testlar</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{availableTests.length}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Biriktirilgan faol modullar</p>
          </div>
          <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-500">Demo testlar</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{availableDemoTests.length}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Sinov modullari soni</p>
          </div>
          <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500">Yakunlangan</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{passedMainResults}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Muvaffaqiyatli topshirilgan test</p>
          </div>
          <div className="rounded-[1.8rem] border border-white/80 bg-white/85 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-500">Demo limiti</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{demoMaxAttempts}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Har bir modul uchun urinish</p>
          </div>
        </section>
      </div>

      {isMainTestsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in sm:p-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-8">
            <div className="mb-5 flex items-center justify-between sm:mb-6">
              <h3 className="text-xl font-black text-gray-900 sm:text-2xl">Asosiy testlar</h3>
              <button onClick={() => setIsMainTestsModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100">
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1.2fr)_460px]">
              <div className="grid grid-cols-1 gap-8">
                {availableTests.map((test: Module) => {
                  const taken = (data.results || []).find((r: any) => r.participantId === user.id && r.moduleId === test.id);
                  return (
                    <div key={test.id} className="flex flex-col rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:max-w-[36rem] sm:p-8 sm:rounded-[2.5rem]">
                      <h4 className="mb-4 text-xl font-black text-gray-900 sm:text-2xl">{test.name}</h4>
                      <div className="mb-6 grid grid-cols-3 gap-2 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f9fbff_0%,#f3f6fb_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:mb-8 sm:gap-4 sm:rounded-[1.7rem] sm:p-4">
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Testlar soni</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{getQuestionCount(test)} ta</p>
                        </div>
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Berilgan vaqt</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{test.settings.durationMinutes} daqiqa</p>
                        </div>
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">O'tish ball</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{test.settings.passingScore}</p>
                        </div>
                      </div>
                      {taken ? (
                        <div className="w-full py-4 bg-white border-2 border-green-500 text-green-600 rounded-2xl font-black text-xs uppercase tracking-widest text-center">
                          NATIJA: {taken.score} BALL
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsMainTestsModalOpen(false);
                            startTest(test, 'main');
                          }}
                          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all"
                        >
                          Testga kirish
                        </button>
                      )}
                    </div>
                  );
                })}
                {availableTests.length === 0 && (
                  <div className="md:col-span-2 py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-black text-xl uppercase tracking-widest">Asosiy testlar yo'q</p>
                  </div>
                )}
              </div>

              <div className="flex min-h-[320px] items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/80 px-5 py-8 sm:min-h-[420px] sm:px-8 sm:py-10">
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_24px_60px_rgba(79,70,229,0.18)] sm:h-44 sm:w-44">
                    <img
                      src={sidebarLogoSrc}
                      alt="Logo"
                      className="h-full w-full scale-[0.9] object-contain"
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
                  <h4 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:mt-8 sm:text-4xl">{siteTitle}</h4>
                  <p className="mt-3 max-w-xs text-base font-semibold leading-7 text-slate-500 sm:text-lg sm:leading-8">{siteSubtitle}</p>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-indigo-500 sm:mt-8">Asosiy testlar</p>
                  <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-slate-600 sm:text-base sm:leading-8">
                    Test topshiriqlarini bajarayotganingizda berilgan vaqtga e'tiborli bo'ling. Agar texnik nosozlik sabab sahifadan chiqib ketsangiz, xavotir olmang, natijalaringiz saqlanadi. Omad yor bo'lsin!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDemoTestsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in sm:p-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-8">
            <div className="mb-5 flex items-center justify-between sm:mb-6">
              <h3 className="text-xl font-black text-gray-900 sm:text-2xl">Demo testlar</h3>
              <button onClick={() => setIsDemoTestsModalOpen(false)} className="rounded-full p-2 hover:bg-gray-100">
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1.2fr)_460px]">
              <div className="grid grid-cols-1 gap-8">
                {availableDemoTests.map((test: Module) => {
                  const attempts = (data.demoResults || []).filter((r: any) => r.participantId === user.id && r.moduleId === test.id);
                  const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
                  const isLimitReached = attempts.length >= demoMaxAttempts;
                  return (
                    <div key={test.id} className="flex flex-col rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:max-w-[36rem] sm:p-8 sm:rounded-[2.5rem]">
                      <h4 className="mb-4 text-xl font-black text-gray-900 sm:text-2xl">{test.name}</h4>
                      <div className="mb-4 grid grid-cols-3 gap-2 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f7fbff_0%,#f1f7ff_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:gap-4 sm:rounded-[1.7rem] sm:p-4">
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Testlar soni</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{getQuestionCount(test)} ta</p>
                        </div>
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Berilgan vaqt</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{test.settings.durationMinutes} daqiqa</p>
                        </div>
                        <div className="rounded-[1rem] border border-white bg-white px-3 py-3 shadow-[0_10px_25px_rgba(148,163,184,0.10)] sm:rounded-[1.25rem] sm:px-5 sm:py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">O'tish ball</p>
                          <p className="mt-3 text-sm font-black tracking-tight text-slate-900 sm:text-lg">{test.settings.passingScore}</p>
                        </div>
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4">Urinishlar soni: {attempts.length} / {demoMaxAttempts}</p>
                      {latest && (
                        <div className="w-full py-3 mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-sm text-center">
                          Oxirgi natija: {latest.score} ball
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (isLimitReached) {
                            alert("Sizda limit tugadi");
                            return;
                          }
                          setIsDemoTestsModalOpen(false);
                          startTest(test, 'demo');
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          isLimitReached
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-blue-600'
                        }`}
                        disabled={isLimitReached}
                      >
                        {isLimitReached ? "Sizda limit tugadi" : "Demo testni boshlash"}
                      </button>
                    </div>
                  );
                })}
                {availableDemoTests.length === 0 && (
                  <div className="md:col-span-2 py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-black text-xl uppercase tracking-widest">Demo testlar yo'q</p>
                  </div>
                )}
              </div>

              <div className="flex min-h-[320px] items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/80 px-5 py-8 sm:min-h-[420px] sm:px-8 sm:py-10">
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_24px_60px_rgba(59,130,246,0.18)] sm:h-44 sm:w-44">
                    <img
                      src={sidebarLogoSrc}
                      alt="Logo"
                      className="h-full w-full scale-[0.9] object-contain"
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
                  <h4 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:mt-8 sm:text-4xl">{siteTitle}</h4>
                  <p className="mt-3 max-w-xs text-base font-semibold leading-7 text-slate-500 sm:text-lg sm:leading-8">{siteSubtitle}</p>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-blue-500 sm:mt-8">Demo testlar</p>
                  <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-slate-600 sm:text-base sm:leading-8">
                    Test topshiriqlarini bajarayotganingizda berilgan vaqtga e'tiborli bo'ling. Agar texnik nosozlik sabab sahifadan chiqib ketsangiz, xavotir olmang, natijalaringiz saqlanadi. Omad yor bo'lsin!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParticipantDashboard;
