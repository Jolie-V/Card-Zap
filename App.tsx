import React, { useState, useCallback } from 'react';
import { AppState, CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult } from './types';
import SetupForm from './components/SetupForm';
import { generateFlashcards } from './services/geminiService';
import LoadingView from './components/LoadingView';
import StudySession from './components/StudySession';
import ResultsScreen from './components/ResultsScreen';
import EditCardsView from './components/EditCardsView';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.FORM);
  const [flashcards, setFlashcards] = useState<(ClassicFlashcard | QuizFlashcard)[]>([]);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  const [deckConfig, setDeckConfig] = useState<{title: string, color: CardColor, mode: GameMode} | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreateNew = useCallback(() => {
    setFlashcards([]);
    setStudyResults([]);
    setDeckConfig(null);
    setError(null);
    setAppState(AppState.FORM);
  }, []);


  const renderContent = () => {
    switch (appState) {
      case AppState.FORM:
        return <SetupForm onSubmit={handleFormSubmit} error={error} />;
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
                  onCreateNew={handleCreateNew} 
                  title={deckConfig?.title || 'Study Results'}
                />;
      default:
        return <SetupForm onSubmit={handleFormSubmit} error={error} />;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-4xl mx-auto my-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;