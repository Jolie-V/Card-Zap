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
  PROFILE = 'PROFILE',
  SUBJECTS = 'SUBJECTS', // Teacher's create/manage page
  STUDENT_SUBJECTS = 'STUDENT_SUBJECTS', // Student's enrolled subjects page
  STUDENT_SUBJECT_DECKS = 'STUDENT_SUBJECT_DECKS', // Student's view of decks in a subject
  SUBJECT_ROOM = 'SUBJECT_ROOM',
  YOUR_FRIENDS = 'YOUR_FRIENDS',
  COOP_LOBBY = 'COOP_LOBBY',
  COOP_GAME = 'COOP_GAME',
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

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

export enum LobbyStatus {
    WAITING = 'waiting',
    IN_PROGRESS = 'in_progress',
    FINISHED = 'finished',
}

export enum LobbyMemberStatus {
    INVITED = 'invited',
    JOINED = 'joined',
    LEFT = 'left',
}


export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  course?: string;
}

export interface Deck {
  id: number;
  user_id: string;
  title: string;
  color: CardColor;
  mode: GameMode;
  created_at: string;
}

export interface Subject {
  id: number;
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
  id: number;
  status: EnrollmentStatus;
  profiles: {
    full_name: string;
    course: string | null;
  };
}

export interface Friend {
    friendship_id: number;
    user_id: string; // The friend's user ID
    full_name: string | null;
    course: string | null;
}

export interface FriendRequest {
    friendship_id: number;
    requester_id: string;
    full_name: string | null;
    course: string | null;
}

export interface StudentProfile {
    id: string;
    full_name: string | null;
    course: string | null;
}

export interface Lobby {
    id: string;
    host_id: string;
    status: LobbyStatus;
    created_at: string;
    deck_id: number | null;
}

export interface LobbyMember {
    lobby_id: string;
    user_id: string;
    status: LobbyMemberStatus;
    score: number;
    joined_at: string | null;
    profile: {
        full_name: string | null;
    };
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