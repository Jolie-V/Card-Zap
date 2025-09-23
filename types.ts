export enum AppState {
  LOGIN = 'LOGIN',
  YOUR_CARDS = 'YOUR_CARDS',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  FORM = 'FORM',
  GENERATING = 'GENERATING',
  EDITING = 'EDITING',
  STUDYING = 'STUDYING',
  RESULTS = 'RESULTS',
}

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

export interface User {
  email: string;
  role: UserRole;
}

export interface ClassicFlashcard {
  question: string;
  answer: string;
}

export interface QuizFlashcard {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface StudyResult {
  card: ClassicFlashcard | QuizFlashcard;
  isCorrect: boolean;
}
