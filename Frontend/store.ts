
import { User, Group, Subject, Module, Question, TestResult, UserRole } from './types';

// Initial data for demonstration
const INITIAL_USERS: User[] = [
  { id: '1', fullName: 'Admin User', username: 'admin', password: '123', workplace: 'Markaz', role: UserRole.ADMIN },
  { id: '2', fullName: 'Menejer Bekzod', username: 'manager', password: '123', workplace: 'Markaz', role: UserRole.MANAGER },
  { id: '3', fullName: 'Ali Valiyev', username: 'tinglovchi', password: '123', workplace: 'Maktab 1', role: UserRole.PARTICIPANT, groupId: 'g1' },
];

// Fix: Removed 'assignedModuleIds' as it is not present in the Group interface in types.ts
const INITIAL_GROUPS: Group[] = [{
  id: 'g1',
  name: 'Tasviriy San\'at - 2024-01',
  isArchived: false,
  createdAt: new Date().toISOString(),
  moduleIds: ['m1']
}];
const INITIAL_SUBJECTS: Subject[] = [{ id: 's1', name: 'Tasviriy San\'at Nazariyasi' }];
const INITIAL_DEMO_SUBJECTS: Subject[] = [{ id: 'ds1', name: 'Demo: Tasviriy San\'at Nazariyasi' }];

// Fix: Restructured INITIAL_MODULES to match the Module interface.
// questionCount is moved from settings to subjectConfigs, and groupIds is added.
const INITIAL_MODULES: Module[] = [
  {
    id: 'm1',
    name: 'Rangtasvir va Kompozitsiya',
    groupIds: ['g1'],
    subjectConfigs: [
      {
        subjectId: 's1',
        questionCount: 5,
      }
    ],
    settings: {
      pointsPerAnswer: 5,
      durationMinutes: 10,
      passingScore: 15,
      randomize: true,
      isActive: true,
    }
  }
];

const INITIAL_DEMO_MODULES: Module[] = [
  {
    id: 'dm1',
    name: 'Demo: Ranglar asoslari',
    groupIds: ['g1'],
    subjectConfigs: [
      {
        subjectId: 'ds1',
        questionCount: 3,
      }
    ],
    settings: {
      pointsPerAnswer: 5,
      durationMinutes: 8,
      passingScore: 10,
      randomize: true,
      isActive: true,
    }
  }
];

// Fix: Changed 'moduleId' to 'subjectId' in INITIAL_QUESTIONS to align with the Question interface
const INITIAL_QUESTIONS: Question[] = [
  { id: 'q1', subjectId: 's1', text: 'Guanash bo\'yog\'i qanday asosga ega?', options: ['Suv', 'Moy', 'Sirt', 'Lola'], correctIndex: 0 },
  { id: 'q2', subjectId: 's1', text: 'Kompozitsiya qonuniyatlariga nima kirmaydi?', options: ['Yaxlitlik', 'Mantiqsizlik', 'Kontrast', 'Muvozanat'], correctIndex: 1 },
  { id: 'q3', subjectId: 's1', text: 'Asosiy ranglar necha xil?', options: ['2 ta', '3 ta', '5 ta', '7 ta'], correctIndex: 1 },
  { id: 'q4', subjectId: 's1', text: 'Akvarel texnikasida eng muhim vosita nima?', options: ['Loyiha', 'Qalam', 'Suv', 'Yog\''], correctIndex: 2 },
  { id: 'q5', subjectId: 's1', text: 'Portret janri nimani tasvirlaydi?', options: ['Tabiatni', 'Hayvonlarni', 'Insonni', 'Binolarni'], correctIndex: 2 },
];

const INITIAL_DEMO_QUESTIONS: Question[] = [
  { id: 'dq1', subjectId: 'ds1', text: 'Sariq va ko\'k aralashsa qaysi rang hosil bo\'ladi?', options: ['Yashil', 'Qizil', 'Binafsha', 'Qora'], correctIndex: 0 },
  { id: 'dq2', subjectId: 'ds1', text: 'Kontrast nimani anglatadi?', options: ['Bir xil ranglar', 'Farqli elementlar kuchi', 'Faqat qora rang', 'Faqat oq rang'], correctIndex: 1 },
  { id: 'dq3', subjectId: 'ds1', text: 'Kompozitsiyada muvozanat nima?', options: ['Tasodifiy joylashuv', 'Elementlar uyg\'unligi', 'Faqat markaz', 'Rangsizlik'], correctIndex: 1 },
];

export class DataStore {
  private static STORAGE_KEY = 'artedu_test_platform_v1';

  static save(data: any) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  static load() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const modules = parsed.modules || [];
      const migratedUsers = (parsed.users || []).map((user: User) => ({
        ...user,
        workplace: user.workplace || ''
      }));
      const migratedGroups = (parsed.groups || []).map((group: Group) => ({
        ...group,
        isArchived: group.isArchived ?? false,
        createdAt: group.createdAt || new Date().toISOString(),
        moduleIds: group.moduleIds || modules.filter((m: Module) => (m.groupIds || []).includes(group.id)).map((m: Module) => m.id)
      }));
      return {
        ...parsed,
        users: migratedUsers,
        groups: migratedGroups,
        demoSubjects: parsed.demoSubjects || [],
        demoModules: parsed.demoModules || [],
        demoQuestions: parsed.demoQuestions || [],
        demoResults: parsed.demoResults || []
      };
    }
    
    const initialData = {
      users: INITIAL_USERS,
      groups: INITIAL_GROUPS,
      subjects: INITIAL_SUBJECTS,
      modules: INITIAL_MODULES,
      questions: INITIAL_QUESTIONS,
      results: [] as TestResult[],
      demoSubjects: INITIAL_DEMO_SUBJECTS,
      demoModules: INITIAL_DEMO_MODULES,
      demoQuestions: INITIAL_DEMO_QUESTIONS,
      demoResults: [] as TestResult[]
    };
    this.save(initialData);
    return initialData;
  }
}
