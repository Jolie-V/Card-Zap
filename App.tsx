

import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { UserRole } from './types';

// Components
import LoadingView from './components/LoadingView';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load page components for faster initial load
const LoginPage = lazy(() => import('./components/LoginPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const YourCardsPage = lazy(() => import('./components/YourCardsPage'));
const CreateDeckPage = lazy(() => import('./components/CreateDeckPage'));
const EditCardsView = lazy(() => import('./components/EditCardsView'));
const StudySession = lazy(() => import('./components/StudySession'));
const ResultsScreen = lazy(() => import('./components/ResultsScreen'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
// Teacher Pages
const SubjectsPage = lazy(() => import('./components/SubjectsPage'));
const SubjectRoomPage = lazy(() => import('./components/SubjectRoomPage'));
// Student Pages
const YourSubjectsPage = lazy(() => import('./components/YourSubjectsPage'));
const StudentSubjectDecksPage = lazy(() => import('./components/StudentSubjectDecksPage'));
const YourFriendsPage = lazy(() => import('./components/YourFriendsPage'));
// Game
const MultiplayerGameSession = lazy(() => import('./components/MultiplayerGameSession'));

// Admin Pages
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const StudentsPage = lazy(() => import('./components/StudentsPage'));
const TeachersPage = lazy(() => import('./components/TeachersPage'));
const AdminSubjectsPage = lazy(() => import('./components/AdminSubjectsPage'));


const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemedApp />
    </AuthProvider>
  );
};

const ThemedApp: React.FC = () => {
    const { user, loadingInitial } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const theme = user?.preferred_theme || 'system';
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [user?.preferred_theme]);

    const isDashboard = user && location.pathname !== '/login';
    const isStudySession = location.pathname.startsWith('/study') || location.pathname.startsWith('/guest/study') || location.pathname.startsWith('/game/');

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${isDashboard ? 'bg-primary-100 dark:bg-gray-900' : `bg-gradient-to-br from-primary-100 to-primary-200 dark:from-gray-800 dark:to-gray-900 flex p-2 sm:p-4 ${isStudySession ? 'items-stretch' : 'items-center'} justify-center`}`}>
            <Suspense fallback={<LoadingView title="Loading Page..." message="Getting things ready for you." />}>
                 {loadingInitial ? (
                    <LoadingView title="CardZap" message="Connecting..." />
                ) : (
                    <Routes>
                        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
                        
                        {/* Guest-only study flow */}
                        <Route path="/guest/create" element={!user ? <CreateDeckPage /> : <Navigate to="/" replace />} />
                        <Route path="/guest/edit" element={!user ? <EditCardsView /> : <Navigate to="/" replace />} />
                        <Route path="/guest/study" element={!user ? <StudySession /> : <Navigate to="/" replace />} />
                        <Route path="/guest/results" element={!user ? <ResultsScreen /> : <Navigate to="/" replace />} />

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/game/:roomId" element={<MultiplayerGameSession />} />
                            <Route path="/*" element={<DashboardLayout />}>
                                <Route index element={<Navigate to={user?.role === UserRole.ADMIN ? "/admin" : "/your-cards"} replace />} />
                                
                                {/* Shared Routes */}
                                <Route path="your-cards" element={<YourCardsPage />} />
                                <Route path="create-deck" element={<CreateDeckPage />} />
                                <Route path="edit-deck/:deckId" element={<EditCardsView />} />
                                <Route path="study-deck/:deckId" element={<StudySession />} />
                                <Route path="results" element={<ResultsScreen />} />
                                <Route path="profile" element={<ProfilePage />} />
                                <Route path="settings" element={<SettingsPage />} />
                                
                                {/* Student Routes */}
                                <Route path="your-subjects" element={<YourSubjectsPage />} />
                                <Route path="your-subjects/:subjectId" element={<StudentSubjectDecksPage />} />
                                <Route path="study-subject-deck/:deckId/subject/:subjectId" element={<StudySession />} />
                                <Route path="friends" element={<YourFriendsPage />} />


                                {/* Teacher Routes */}
                                <Route path="subjects" element={<SubjectsPage />} />
                                <Route path="subjects/:subjectId" element={<SubjectRoomPage />} />
                                
                                {/* Admin Routes */}
                                <Route path="admin" element={<AdminDashboard />} />
                                <Route path="admin/students" element={<StudentsPage />} />
                                <Route path="admin/teachers" element={<TeachersPage />} />
                                <Route path="admin/subjects" element={<AdminSubjectsPage />} />

                                {/* Fallback for logged-in users */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Route>
                    </Routes>
                )}
            </Suspense>
        </div>
    );
};

export default App;
