
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  PARTICIPANT = 'TINGLOVCHI'
}

export interface User {
  id: string | number;
  fullName: string;
  username: string;
  password?: string;
  workplace?: string;
  role: UserRole;
  groupId?: string | number;
}

export interface Group {
  id: string | number;
  name: string;
  isArchived?: boolean;
  createdAt?: string;
  moduleIds?: Array<string | number>;
}

export interface Subject {
  id: string | number;
  name: string;
}

export interface Module {
  id: string | number;
  name: string;
  groupIds: Array<string | number>; // Ushbu test qaysi guruhlar uchun
  subjectConfigs: {
    subjectId: string | number;
    questionCount: number; // Ushbu fandan nechta savol tushishi kerak
  }[];
  settings: {
    pointsPerAnswer: number;
    durationMinutes: number;
    passingScore: number;
    randomize: boolean;
    isActive: boolean;
  };
}

export interface DemoDataShape {
  demoSubjects?: Subject[];
  demoModules?: Module[];
  demoQuestions?: Question[];
  demoResults?: TestResult[];
}

export interface Question {
  id: string | number;
  subjectId: string | number; // Savol fanga bog'lanadi (Baza)
  text: string;
  options: string[];
  correctIndex: number;
}

export interface TestResult {
  id: string | number;
  participantId: string | number;
  moduleId: string | number;
  groupId: string | number;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  isPassed: boolean;
  date: string;
  timeTaken?: number;
}
