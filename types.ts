

export enum GameMode {
  CLASSIC = 'CLASSIC',
  QUIZ = 'QUIZ',
}

export enum CardColor {
  Pink = 'pink',
  Red = 'red',
  Orange = 'orange',
  Yellow = 'yellow',
  Green = 'green',
  Blue = 'blue',
  Purple = 'purple',
  Gray = 'gray',
}

export enum UserRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  ADMIN = 'Admin',
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}

export enum ThemePreference {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum AppState {
  // Student
  YOUR_CARDS = 'YOUR_CARDS',
  STUDENT_SUBJECTS = 'STUDENT_SUBJECTS',

  // Teacher
  SUBJECTS = 'SUBJECTS',

  // Admin
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_STUDENTS = 'ADMIN_STUDENTS',
  ADMIN_TEACHERS = 'ADMIN_TEACHERS',
  ADMIN_SUBJECTS = 'ADMIN_SUBJECTS',

  // Shared
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
}


export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  course?: string;
  preferred_theme: ThemePreference;
  avatar_url?: string;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  color: CardColor;
  mode: GameMode;
  created_at: string;
  is_assessment: boolean;
  highest_score?: number | null;
}

export interface Subject {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  image_url?: string;
  created_at: string;
  subject_code: string;
}

export interface EnrolledSubject extends Subject {
  enrollment_status: EnrollmentStatus;
}


export interface SubjectEnrollment {
  id: string;
  status: EnrollmentStatus;
  profiles: {
    full_name: string;
    course: string | null;
  };
}

export interface AdminStudentView {
  id: string;
  full_name: string;
  email: string;
  course: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AdminTeacherView {
  id: string;
  full_name: string;
  email: string;
  course: string | null;
  avatar_url: string | null;
  created_at: string;
  subject_count: number;
}

export interface AdminSubjectView {
  id: number;
  title: string;
  subject_code: string;
  teacher_name: string;
  student_count: number;
  created_at: string;
}

export interface ClassicFlashcard {
  question: string;
  answer: string;
}

export interface QuizFlashcard {
  question: string;
  options: string[];
  correctanswer: string;
}

export interface StudyResult {
  card: ClassicFlashcard | QuizFlashcard;
  isCorrect: boolean;
}

export interface Friend {
  friendship_id: number;
  id: string; // profile id
  full_name: string;
  avatar_url?: string;
  course?: string;
}

export interface FriendRequest {
  friendship_id: number;
  id: string; // profile id of requester
  full_name: string;
  avatar_url?: string;
  course?: string;
}
