export enum AppState {
  LOGIN = 'LOGIN',
  YOUR_CARDS = 'YOUR_CARDS',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  FORM = 'FORM',
  GENERATING_NEW_DECK = 'GENERATING_NEW_DECK',
  GENERATING = 'GENERATING',
  SAVING_DECK = 'SAVING_DECK',
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
  id: string;
  email: string;
  role: UserRole;
}

export interface Deck {
  id: number;
  user_id: string;
  title: string;
  color: CardColor;
  mode: GameMode;
  created_at: string;
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