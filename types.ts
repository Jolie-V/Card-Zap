export enum AppState {
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