import React, { useState, useCallback } from 'react';
import { AppState, CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult, User, UserRole } from './types';
import SetupForm from './components/SetupForm';
import { generateFlashcards } from './services/geminiService';
import LoadingView from './components/LoadingView';
import StudySession from './components/StudySession';
import ResultsScreen from './components/ResultsScreen';
import EditCardsView from './components/EditCardsView';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import YourCardsPage from './components/YourCardsPage';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [flashcards, setFlashcards] = useState<(ClassicFlashcard | QuizFlashcard)[]>([]);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  const [deckConfig, setDeckConfig] = useState<{title: string, color: CardColor, mode: GameMode} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === UserRole.ADMIN) {
      setAppState(AppState.ADMIN_DASHBOARD);
    } else {
      setAppState(AppState.YOUR_CARDS);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setAppState(AppState.LOGIN);
    // Reset all state
    setFlashcards([]);
    setStudyResults([]);
    setDeckConfig(null);
    setError(null);
  }, []);

  const handleStartCreateNew = useCallback(() => {
    setAppState(AppState.FORM);
  }, []);

  const handleBackToDecks = useCallback(() => {
     setFlashcards([]);
     setStudyResults([]);
     setDeckConfig(null);
     setError(null);
     setAppState(AppState.YOUR_CARDS);
  }, []);

  const handleFormSubmit = useCallback(async (
    title: string,
    mode: GameMode,
    inputText: string,
    cardCount: number,
    color: CardColor
  ) => {
    setAppState(AppState.GENERATING);
    setError(null);
    setDeckConfig({ title, color, mode });
    try {
      const generatedCards = await generateFlashcards(inputText, cardCount, mode);
      setFlashcards(generatedCards);
      setAppState(AppState.EDITING);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate flashcards. Please check your input and try again. Error: ${errorMessage}`);
      setAppState(AppState.FORM);
    }
  }, []);

  const handleEditingComplete = useCallback((editedCards: (ClassicFlashcard | QuizFlashcard)[]) => {
    setFlashcards(editedCards);
    setAppState(AppState.STUDYING);
  }, []);
  
  const handleSessionComplete = useCallback((results: StudyResult[]) => {
    setStudyResults(results);
    setAppState(AppState.RESULTS);
  }, []);

  const handleRestart = useCallback(() => {
    setStudyResults([]);
    setAppState(AppState.STUDYING);
  }, []);

  const renderDashboardContent = () => {
    switch (appState) {
      case AppState.YOUR_CARDS:
        return <YourCardsPage onCreateNew={handleStartCreateNew} />;
      case AppState.ADMIN_DASHBOARD:
        return <AdminDashboard />;
      case AppState.FORM:
        return <SetupForm onSubmit={handleFormSubmit} error={error} onBack={handleBackToDecks} />;
      case AppState.GENERATING:
        return <LoadingView />;
      case AppState.EDITING:
        if (deckConfig && flashcards.length > 0) {
            return (
              <EditCardsView
                initialCards={flashcards}
                deckConfig={deckConfig}
                onComplete={handleEditingComplete}
              />
            );
          }
          return <LoadingView />; // Fallback
      case AppState.STUDYING:
        if (deckConfig && flashcards.length > 0) {
          return (
            <StudySession 
              cards={flashcards}
              mode={deckConfig.mode}
              color={deckConfig.color}
              title={deckConfig.title}
              onSessionComplete={handleSessionComplete}
            />
          );
        }
        return <LoadingView />; // Fallback
      case AppState.RESULTS:
        return <ResultsScreen 
                  results={studyResults} 
                  onRestart={handleRestart} 
                  onBackToDecks={handleBackToDecks} 
                  title={deckConfig?.title || 'Study Results'}
                />;
      default:
        // If logged in, but in a weird state, default to the main page for their role.
        if (user?.role === UserRole.ADMIN) {
          return <AdminDashboard />;
        }
        return <YourCardsPage onCreateNew={handleStartCreateNew} />;
    }
  };

  if (!user) {
    return (
       <div className="bg-primary-100 text-primary-700 min-h-screen font-sans flex items-center justify-center p-4">
          <LoginPage onLogin={handleLogin} />
       </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      {renderDashboardContent()}
    </DashboardLayout>
  );
};

export default App;
