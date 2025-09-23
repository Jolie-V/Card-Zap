import React, { useState, useCallback, useEffect } from 'react';
import { AppState, CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult, User, UserRole, Deck } from './types';
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
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [flashcards, setFlashcards] = useState<(ClassicFlashcard | QuizFlashcard)[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  const [deckConfig, setDeckConfig] = useState<{title: string, color: CardColor, mode: GameMode} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const fetchDecks = useCallback(async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (fetchError) {
      console.error('Error fetching decks:', fetchError);
      setError(`Failed to load your decks. The database tables might not be set up correctly. (Details: ${fetchError.message})`);
    } else {
      setDecks(data || []);
    }
  }, []);

  useEffect(() => {
    setLoadingInitial(true);

    const getProfileWithRetry = async (userId: string, retries = 10, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (profile) return profile;
        await new Promise(res => setTimeout(res, delay));
      }
      return null;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setError(null); // Clear previous errors on auth state change
      if (session) {
        const profile = await getProfileWithRetry(session.user.id);
        
        if (profile) {
          const loggedInUser = { id: session.user.id, email: session.user.email!, role: profile.role as UserRole };
          setUser(loggedInUser);
          if (profile.role === UserRole.ADMIN) {
            setAppState(AppState.ADMIN_DASHBOARD);
          } else {
            await fetchDecks(session.user.id);
            setAppState(AppState.YOUR_CARDS);
          }
        } else {
          setError("Your user profile could not be loaded. This can happen right after sign-up due to a database delay. Please try signing in again.");
          console.error("User profile not found after multiple attempts. Signing out.");
          await supabase.auth.signOut();
        }
      } else {
        setUser(null);
        setDecks([]);
        setAppState(AppState.LOGIN);
      }
      setLoadingInitial(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchDecks]);

  const handleSignIn = useCallback(async (credentials: { email: string; password: string }) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
  }, []);

  const handleSignUp = useCallback(async (credentials: { email: string; password: string; role: UserRole }) => {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: { data: { role: credentials.role } },
    });
    if (error) throw error;
    alert('Sign up successful! You will now be logged in.');
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
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

  const handleSaveDeckAndStudy = useCallback(async (editedCards: (ClassicFlashcard | QuizFlashcard)[]) => {
    if (!user || !deckConfig) return;

    setAppState(AppState.GENERATING); // Show loading while saving

    const { data: deckData, error: deckError } = await supabase
      .from('decks')
      .insert({
        user_id: user.id,
        title: deckConfig.title,
        color: deckConfig.color,
        mode: deckConfig.mode,
      })
      .select()
      .single();

    if (deckError) {
      setError(`Error saving deck: ${deckError.message}`);
      setAppState(AppState.EDITING); // Go back to editing on error
      return;
    }

    const flashcardsToInsert = editedCards.map(card => {
      const base = { deck_id: deckData.id, question: card.question };
      if (deckConfig.mode === GameMode.CLASSIC) {
        return { ...base, answer: (card as ClassicFlashcard).answer };
      }
      return { ...base, options: (card as QuizFlashcard).options, correct_answer: (card as QuizFlashcard).correctAnswer };
    });

    const { error: cardsError } = await supabase.from('flashcards').insert(flashcardsToInsert);

    if (cardsError) {
      setError(`Error saving flashcards: ${cardsError.message}`);
      await supabase.from('decks').delete().eq('id', deckData.id); // Clean up failed deck
      setAppState(AppState.EDITING);
      return;
    }

    await fetchDecks(user.id);
    setFlashcards(editedCards);
    setAppState(AppState.STUDYING);
  }, [user, deckConfig, fetchDecks]);
  
  const handleStudyDeck = useCallback(async (deck: Deck) => {
    setAppState(AppState.GENERATING); // Show loading view while fetching cards
    const { data, error } = await supabase.from('flashcards').select('*').eq('deck_id', deck.id);

    if (error) {
      setError(`Error fetching cards: ${error.message}`);
      setAppState(AppState.YOUR_CARDS);
      return;
    }

    const fetchedCards = data.map(c => {
      if (deck.mode === GameMode.CLASSIC) {
        return { question: c.question, answer: c.answer } as ClassicFlashcard;
      }
      return { question: c.question, options: c.options, correctAnswer: c.correct_answer } as QuizFlashcard;
    });

    setFlashcards(fetchedCards);
    setDeckConfig({ title: deck.title, color: deck.color, mode: deck.mode });
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
        return <YourCardsPage onCreateNew={handleStartCreateNew} decks={decks} onStudyDeck={handleStudyDeck} error={error} />;
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
                onComplete={handleSaveDeckAndStudy}
              />
            );
          }
          return <LoadingView />;
      case AppState.STUDYING:
        if (deckConfig && flashcards.length > 0) {
          return (
            <StudySession 
              cards={flashcards}
              mode={deckConfig.mode}
              color={deckConfig.color}
              title={deckConfig.title}
              onSessionComplete={handleSessionComplete}
              onExit={handleBackToDecks}
            />
          );
        }
        return <LoadingView />;
      case AppState.RESULTS:
        return <ResultsScreen 
                  results={studyResults} 
                  onRestart={handleRestart} 
                  onBackToDecks={handleBackToDecks} 
                  title={deckConfig?.title || 'Study Results'}
                />;
      default:
        if (user?.role === UserRole.ADMIN) {
          return <AdminDashboard />;
        }
        return <YourCardsPage onCreateNew={handleStartCreateNew} decks={decks} onStudyDeck={handleStudyDeck} error={error} />;
    }
  };

  if (loadingInitial) {
    return (
      <div className="bg-primary-100 min-h-screen flex items-center justify-center">
        <LoadingView />
      </div>
    );
  }

  if (!user) {
    return (
       <div className="bg-primary-100 text-primary-700 min-h-screen font-sans flex items-center justify-center p-4">
          <LoginPage onSignIn={handleSignIn} onSignUp={handleSignUp} error={error} />
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