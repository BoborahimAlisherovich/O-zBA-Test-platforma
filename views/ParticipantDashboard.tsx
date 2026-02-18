
import React, { useState, useEffect, useRef } from 'react';
import { User, Module, Question, TestResult, Group, Subject } from '../types';
import { submitTest } from '../api';
import { 
  Clock, CheckCircle2, AlertCircle, Award, History, 
  ArrowRight, Layers, CheckCircle, HelpCircle, 
  XCircle, Timer, LogOut, Sparkles, BookOpen, ChevronRight, Zap
} from 'lucide-react';

interface ParticipantDashboardProps {
  user: User;
  data: any;
  updateData: (newData: any) => void;
}

const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({ user, data, updateData }) => {
  const [activeTest, setActiveTest] = useState<Module | null>(null);
  const [activeTestType, setActiveTestType] = useState<'main' | 'demo'>('main');
  const [previewTest, setPreviewTest] = useState<Module | null>(null);
  const [previewTestType, setPreviewTestType] = useState<'main' | 'demo'>('main');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState<TestResult | null>(null);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [isMainTestsModalOpen, setIsMainTestsModalOpen] = useState(false);
  const [isDemoTestsModalOpen, setIsDemoTestsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const participantGroup = (data.groups || []).find((g: Group) => String(g.id) === String(user.groupId));
  const assignedModuleIds = participantGroup?.moduleIds || [];
  const shuffleArray = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  const shuffleQuestionOptions = (question: Question): Question => {
    const optionObjects = question.options.map((option, index) => ({ option, index }));
    const shuffled = shuffleArray(optionObjects);
    const newCorrectIndex = shuffled.findIndex((item) => item.index === question.correctIndex);
    return {
      ...question,
      options: shuffled.map((item) => item.option),
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : question.correctIndex
    };
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

  const startTest = (test: Module, type: 'main' | 'demo' = 'main') => {
    const resultKey = type === 'demo' ? 'demoResults' : 'results';
    const questionsPool: Question[] = type === 'demo' ? (data.demoQuestions || []) : (data.questions || []);
    const alreadyTaken = (data[resultKey] || []).find((r: any) => r.participantId === user.id && r.moduleId === test.id);
    if (type === 'main' && alreadyTaken) {
      alert("Siz ushbu testni topshirib bo'lgansiz!");
      return;
    }

    // Har bir fan bo'yicha belgilangan miqdordagi savollarni yig'ish
    let selectedQuestions: Question[] = [];
    test.subjectConfigs.forEach(config => {
      const subjectQuestions = questionsPool.filter((q: Question) => q.subjectId === config.subjectId);
      let shuffled = shuffleArray(subjectQuestions);
      selectedQuestions = [...selectedQuestions, ...shuffled.slice(0, config.questionCount)];
    });

    // Savollar ham, variantlar ham random aralashib tushadi
    selectedQuestions = shuffleArray(selectedQuestions).map(shuffleQuestionOptions);

    if (selectedQuestions.length === 0) {
      alert("Test uchun savollar topilmadi.");
      return;
    }

    setCurrentQuestions(selectedQuestions);
    setActiveTest(test);
    setActiveTestType(type);
    setTimeLeft(test.settings.durationMinutes * 60);
    setAnswers({});
    setStartTime(Date.now());
  };

  useEffect(() => {
    if (activeTest && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            completeTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTest, timeLeft]);

  const completeTest = async () => {
    if (!activeTest) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const result = await submitTest({
        moduleId: activeTest.id,
        answers,
        timeTaken: Math.floor((Date.now() - startTime) / 1000),
      });

      const resultKey = activeTestType === 'demo' ? 'demoResults' : 'results';
      updateData({ [resultKey]: [...(data[resultKey] || []), result] });
      setShowResult(result);
      setActiveTest(null);
      setActiveTestType('main');
    } catch (err: any) {
      alert(err?.message || "Testni yakunlashda xatolik yuz berdi");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (activeTest) {
    const answeredCount = currentQuestions.filter((q) => answers[q.id] !== undefined).length;
    return (
      <div className="max-w-4xl mx-auto p-4 lg:p-10 animate-in fade-in duration-500">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-50 p-5 shadow-sm rounded-3xl mb-8 flex justify-between items-center border border-gray-100">
           <div className="min-w-0">
             <h3 className="font-black text-xl text-gray-900">{activeTest.name}</h3>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Test jarayoni...</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700">
                <p className="text-[10px] font-black uppercase tracking-wider">Yechilgan</p>
                <p className="font-black text-lg tabular-nums">{answeredCount}/{currentQuestions.length}</p>
              </div>
              <div className="flex items-center gap-2 text-white bg-indigo-600 px-5 py-3 rounded-2xl shadow-lg shadow-indigo-200">
                <Timer className="w-5 h-5 animate-spin-slow" />
                <span className="font-black text-2xl tabular-nums">{formatTime(timeLeft)}</span>
              </div>
           </div>
        </div>

        <div className="space-y-8">
          {currentQuestions.map((q, idx) => (
            <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-6">
                <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-xl text-xs font-black">
                  {idx + 1}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Savol</span>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-8 leading-tight">{q.text}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => setAnswers({...answers, [q.id]: oIdx})}
                    className={`group relative p-6 rounded-3xl text-left border-2 transition-all flex items-center gap-4 overflow-hidden ${
                      answers[q.id] === oIdx 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-gray-50 bg-gray-50/30 hover:bg-white hover:border-indigo-100'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${
                      answers[q.id] === oIdx 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-white border border-gray-100 text-gray-400 group-hover:text-indigo-600'
                    }`}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className={`font-bold transition-colors ${answers[q.id] === oIdx ? 'text-indigo-900' : 'text-gray-600'}`}>
                      {opt}
                    </span>
                    {answers[q.id] === oIdx && (
                      <div className="absolute right-4 text-indigo-200">
                        <CheckCircle className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button 
            onClick={() => setIsConfirmingFinish(true)} 
            className="group relative px-16 py-7 bg-indigo-600 text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3 text-lg uppercase tracking-widest">
              Testni Yakunlash <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
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
      <div className="max-w-2xl mx-auto p-10 animate-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-gray-100 relative">
           <div className={`h-6 w-full ${showResult.isPassed ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />
           <div className="p-16 text-center">
              <div className="relative inline-block mb-10">
                {showResult.isPassed ? (
                  <>
                    <Award className="w-28 h-28 text-green-500 relative z-10" />
                    <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-4 -right-4 animate-pulse" />
                  </>
                ) : (
                  <XCircle className="w-28 h-28 text-red-500 relative z-10" />
                )}
              </div>
              
              <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter">
                {showResult.isPassed ? 'Muvaffaqiyatli' : 'Natija yetarli emas!'}
              </h2>
              <p className="text-gray-400 font-bold uppercase tracking-[0.3em] mb-12">
                Sizning test natijangiz tayyor
              </p>

              <div className="grid grid-cols-2 gap-6 mb-12">
                 <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">To'g'ri javob</p>
                    <p className="text-4xl font-black text-indigo-600">{showResult.correctAnswers}</p>
                 </div>
                 <div className={`p-8 rounded-[2.5rem] text-white shadow-xl ${showResult.isPassed ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}>
                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-2">To'plangan ball</p>
                    <p className="text-4xl font-black">{showResult.score}</p>
                 </div>
              </div>

              <button 
                onClick={() => setShowResult(null)} 
                className="w-full py-7 bg-gray-900 text-white rounded-[2rem] font-black hover:bg-indigo-600 shadow-2xl transition-all uppercase tracking-widest text-sm"
              >
                ASOSIY SAHIFAGA QAYTISH
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* KREATIV HEADER */}
      <header className="mb-20 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-100/30 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 right-0 w-60 h-60 bg-blue-100/20 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-end gap-3 mb-6">
          <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em] ml-1">Xush kelibsiz</span>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mt-1">
              Salom, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">{user.fullName}</span>!
            </h2>
          </div>
        </div>
        <p className="text-gray-400 text-xl font-medium italic border-l-4 border-indigo-100 pl-6 py-2">
          Platformada sizga biriktirilgan faol testlar ro'yxati bilan tanishing: Asosiy testlar
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setIsMainTestsModalOpen(true)}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all text-left"
        >
          <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Asosiy testlar</p>
          <p className="text-2xl font-black text-gray-900">{availableTests.length} ta test</p>
          <p className="text-gray-500 mt-2">Asosiy test modullarini ochish</p>
        </button>
        <button
          onClick={() => setIsDemoTestsModalOpen(true)}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all text-left"
        >
          <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Demo testlar</p>
          <p className="text-2xl font-black text-gray-900">{availableDemoTests.length} ta test</p>
          <p className="text-gray-500 mt-2">Demo test modullarini ochish</p>
        </button>
      </div>

      {isMainTestsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">Asosiy testlar</h3>
              <button onClick={() => setIsMainTestsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {availableTests.map((test: Module) => {
                const taken = (data.results || []).find((r: any) => r.participantId === user.id && r.moduleId === test.id);
                return (
                  <div key={test.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                    <h4 className="text-2xl font-black text-gray-900 mb-4">{test.name}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <div className="text-sm font-bold text-gray-700">Vaqt: {test.settings.durationMinutes} daqiqa</div>
                      <div className="text-sm font-bold text-gray-700">O'tish bali: {test.settings.passingScore}</div>
                    </div>
                    {taken ? (
                      <div className="w-full py-4 bg-white border-2 border-green-500 text-green-600 rounded-2xl font-black text-xs uppercase tracking-widest text-center">
                        NATIJA: {taken.score} BALL
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsMainTestsModalOpen(false);
                          setPreviewTest(test);
                          setPreviewTestType('main');
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
          </div>
        </div>
      )}

      {isDemoTestsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">Demo testlar</h3>
              <button onClick={() => setIsDemoTestsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {availableDemoTests.map((test: Module) => {
                const attempts = (data.demoResults || []).filter((r: any) => r.participantId === user.id && r.moduleId === test.id);
                const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
                return (
                  <div key={test.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                    <h4 className="text-2xl font-black text-gray-900 mb-4">{test.name}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <div className="text-sm font-bold text-gray-700">Vaqt: {test.settings.durationMinutes} daqiqa</div>
                      <div className="text-sm font-bold text-gray-700">O'tish bali: {test.settings.passingScore}</div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4">Urinishlar soni: {attempts.length}</p>
                    {latest && (
                      <div className="w-full py-3 mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold text-sm text-center">
                        Oxirgi natija: {latest.score} ball
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsDemoTestsModalOpen(false);
                        setPreviewTest(test);
                        setPreviewTestType('demo');
                      }}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
                    >
                      Demo testni boshlash
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
          </div>
        </div>
      )}

      {previewTest && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-[19rem] rounded-3xl border-4 border-indigo-300 bg-white shadow-2xl overflow-hidden">
            <div className="px-10 py-2 bg-gradient-to-r from-indigo-900 to-blue-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black">Test Moduli</h3>
              <button onClick={() => setPreviewTest(null)} className="p-1 rounded-full hover:bg-white/20">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <h4 className="text-xl font-black text-gray-900 leading-tight">{previewTest.name}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-[10px] uppercase font-black text-slate-500">Davomiyligi</p>
                  <p className="text-sm font-black text-slate-900">{previewTest.settings.durationMinutes} daqiqa</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <p className="text-[10px] uppercase font-black text-slate-500">O'tish bali</p>
                  <p className="text-sm font-black text-slate-900">{previewTest.settings.passingScore}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPreviewTest(null)} className="flex-1 py-3 rounded-xl text-slate-500 font-black">Bekor qilish</button>
                <button
                  onClick={() => {
                    const testToStart = previewTest;
                    setPreviewTest(null);
                    if (!testToStart) return;
                    startTest(testToStart, previewTestType);
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
                >
                  Boshlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantDashboard;
