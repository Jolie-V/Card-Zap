
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { AppState, CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult, User, UserRole, Deck, Subject, Lobby, LobbyMember } from './types';
import { generateFlashcards } from './services/geminiService';
import LoadingView from './components/LoadingView';
import { supabase } from './services/supabaseClient';
import { getErrorMessage } from './utils';

// Lazy load page components for faster initial load
const SetupForm = lazy(() => import('./components/SetupForm'));
const StudySession = lazy(() => import('./components/StudySession'));
const ResultsScreen = lazy(() => import('./components/ResultsScreen'));
const EditCardsView = lazy(() => import('./components/EditCardsView'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const YourCardsPage = lazy(() => import('./components/YourCardsPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const SubjectsPage = lazy(() => import('./components/SubjectsPage'));
const YourSubjectsPage = lazy(() => import('./components/YourSubjectsPage'));
const SubjectRoomPage = lazy(() => import('./components/SubjectRoomPage'));
const StudentSubjectDecksPage = lazy(() => import('./components/StudentSubjectDecksPage'));
const YourFriendsPage = lazy(() => import('./components/YourFriendsPage'));
const CoopLobbyPage = lazy(() => import('./components/CoopLobbyPage'));
const CoopGamePage = lazy(() => import('./components/CoopGamePage'));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [flashcards, setFlashcards] = useState<(ClassicFlashcard | QuizFlashcard)[]>([]);
  const [studyResults, setStudyResults] = useState<StudyResult[]>([]);
  const [deckConfig, setDeckConfig] = useState<{title: string, color: CardColor, mode: GameMode} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [currentStudiedDeck, setCurrentStudiedDeck] = useState<Deck | null>(null);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [lobbyMembers, setLobbyMembers] = useState<LobbyMember[]>([]);
  const generationTask = React.useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoadingInitial(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      if (session) {
        const basicUser: User = { 
          id: session.user.id, 
          email: session.user.email!, 
          role: UserRole.STUDENT,
          full_name: session.user.email!,
        };
        setUser(basicUser);
        setLoadingInitial(false);

        (async () => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!isMounted) return;

            if (profileError || !profile) {
              console.error("CRITICAL: Profile not found for session. Signing out.", getErrorMessage(profileError));
              await supabase.auth.signOut();
              return;
            }
            
            const fullUser: User = { 
              id: session.user.id, 
              email: session.user.email!, 
              role: profile.role as UserRole,
              full_name: profile.full_name || session.user.email!,
              course: profile.course,
            };
            
            setUser(fullUser);
            
            if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN') {
               if (fullUser.role === UserRole.ADMIN) {
                  setAppState(AppState.ADMIN_DASHBOARD);
              } else {
                  setAppState(AppState.YOUR_CARDS);
              }
            }
          } catch (e) {
             if (isMounted) {
                console.error("Error fetching profile, signing out:", getErrorMessage(e));
                await supabase.auth.signOut();
             }
          }
        })();
      } else {
        setUser(null);
        setAppState(AppState.LOGIN);
        generationTask.current = 0;
        setFlashcards([]);
        setStudyResults([]);
        setDeckConfig(null);
        setEditingDeck(null);
        setCurrentStudiedDeck(null);
        setCurrentSubject(null);
        setCurrentLobby(null);
        setLobbyMembers([]);
        setError(null);
        setLoadingInitial(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription for lobby members
  useEffect(() => {
    if (!currentLobby) return;

    const channel = supabase
      .channel(`lobby_${currentLobby.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_members',
          filter: `lobby_id=eq.${currentLobby.id}`,
        },
        async (payload) => {
          console.log('Lobby member change received!', payload);
          // Refetch all members to ensure consistency
          const { data, error } = await supabase
            .from('lobby_members')
            .select('*, profile:profiles(full_name)')
            .eq('lobby_id', currentLobby.id);
          
          if (error) {
            console.error('Error refetching lobby members:', error);
          } else {
            setLobbyMembers(data as any[] || []);
          }
        }
      )
      .subscribe();
      
      // Initial fetch of members
      (async () => {
         const { data, error } = await supabase
            .from('lobby_members')
            .select('*, profile:profiles(full_name)')
            .eq('lobby_id', currentLobby.id);
        if (error) {
            setError(`Failed to fetch lobby members: ${getErrorMessage(error)}`);
        } else {
            setLobbyMembers(data as any[] || []);
        }
      })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentLobby]);


  const handleSignIn = useCallback(async (credentials: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
        throw error;
    }
  }, []);

  const handleSignUp = useCallback(async (credentials: { email: string; password: string; role: UserRole; fullName: string; course: string; }) => {
    setError(null);
    try {
        const { error } = await supabase.auth.signUp({
            email: credentials.email,
            password: credentials.password,
            options: { 
                data: { 
                    role: credentials.role,
                    full_name: credentials.fullName,
                    course: credentials.course || null,
                } 
            },
        });
        if (error) throw error;
        alert('Sign up successful! Please check your email to confirm your account. You will then be able to log in.');
    } catch (err) {
        const errorMessage = getErrorMessage(err);
        if (errorMessage.includes("schema cache")) {
            throw new Error("SCHEMA_CACHE_ERROR:Sign-up failed due to a database sync issue. A page refresh is required to sync with the latest database changes.");
        }
        throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
    } catch (e) {
      console.error("Error during sign out:", getErrorMessage(e));
      setError(`Failed to log out. Error: ${getErrorMessage(e)}`);
      setUser(null);
      setAppState(AppState.LOGIN);
    }
  }, []);
  
  const handleContinueAsGuest = useCallback(() => {
    setError(null);
    setAppState(AppState.FORM);
  }, []);
  
  const handleNavigate = useCallback((page: AppState) => {
    if ([AppState.YOUR_CARDS, AppState.PROFILE, AppState.SUBJECTS, AppState.STUDENT_SUBJECTS, AppState.YOUR_FRIENDS].includes(page)) {
      generationTask.current = 0;
      setFlashcards([]);
      setStudyResults([]);
      setDeckConfig(null);
      setError(null);
      setEditingDeck(null);
      setCurrentStudiedDeck(null);
      setCurrentSubject(null);
      setCurrentLobby(null);
      setLobbyMembers([]);
    }
    setAppState(page);
  }, []);
  
  const handleNavigateToSubjectRoom = useCallback((subject: Subject) => {
    setCurrentSubject(subject);
    setAppState(AppState.SUBJECT_ROOM);
  }, []);

  const handleNavigateToStudentDecks = useCallback((subject: Subject) => {
    setCurrentSubject(subject);
    setAppState(AppState.STUDENT_SUBJECT_DECKS);
  }, []);

  const handleBackToDecks = useCallback(() => {
    handleNavigate(AppState.YOUR_CARDS);
  }, [handleNavigate]);

  const handleStartCreateNew = useCallback(() => {
    setAppState(AppState.FORM);
  }, []);

  const handleFormSubmit = useCallback(async (
    title: string,
    mode: GameMode,
    inputText: string,
    cardCount: number,
    color: CardColor
  ) => {
    const taskId = Date.now();
    generationTask.current = taskId;
    setAppState(AppState.GENERATING_NEW_DECK);
    setError(null);
    setDeckConfig({ title, color, mode });
    try {
      const generatedCards = await generateFlashcards(inputText, cardCount, mode);
      if (generationTask.current === taskId) {
        setFlashcards(generatedCards);
        setAppState(AppState.EDITING);
      }
    } catch (e) {
      if (generationTask.current === taskId) {
        console.error("Error generating flashcards:", getErrorMessage(e));
        setError(`Failed to generate flashcards. Please check your input and try again. Error: ${getErrorMessage(e)}`);
        setAppState(AppState.FORM);
      }
    }
  }, []);

  const handleSaveDeckAndStudy = useCallback(async (editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string) => {
    if (!user || !deckConfig) return;
    
    const taskId = Date.now();
    generationTask.current = taskId;
    setAppState(AppState.SAVING_DECK);
    setError(null);

    const { data: deckData, error: deckError } = await supabase
      .from('decks')
      .insert({
        user_id: user.id,
        title: newTitle,
        color: deckConfig.color,
        mode: deckConfig.mode,
      })
      .select()
      .single();

    if (deckError) {
        if (generationTask.current === taskId) {
            const errorMessage = getErrorMessage(deckError);
            if (errorMessage.includes("schema cache")) {
                setError("SCHEMA_CACHE_ERROR:Failed to save deck due to a database sync issue. A page refresh is required to sync with the latest database changes.");
            } else {
                setError(`Error saving deck: ${errorMessage}`);
            }
            setAppState(AppState.EDITING);
        }
        return;
    }

    const flashcardsToInsert = editedCards.map(card => {
      const base = { deck_id: deckData.id, question: card.question };
      if (deckConfig.mode === GameMode.CLASSIC) {
        return { ...base, answer: (card as ClassicFlashcard).answer };
      }
      return { ...base, options: (card as QuizFlashcard).options, correct_answer: (card as QuizFlashcard).correctAnswer };
    });

    if (flashcardsToInsert.length > 0) {
      const { error: cardsError } = await supabase.from('flashcards').insert(flashcardsToInsert);

      if (cardsError) {
        if (generationTask.current === taskId) {
          setError(`Error saving flashcards: ${getErrorMessage(cardsError)}`);
          await supabase.from('decks').delete().eq('id', deckData.id);
          setAppState(AppState.EDITING);
        }
        return;
      }
    }
    
    if (generationTask.current === taskId) {
      setCurrentStudiedDeck(deckData);
      setFlashcards(editedCards);
      setDeckConfig({ ...deckConfig, title: newTitle });
      setAppState(AppState.STUDYING);
    }
  }, [user, deckConfig]);

  const handleStartGuestStudySession = useCallback((editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string) => {
    if (!deckConfig) return;
    setFlashcards(editedCards);
    setDeckConfig({ ...deckConfig, title: newTitle });
    setCurrentStudiedDeck(null); // Explicitly null for guests
    setAppState(AppState.STUDYING);
  }, [deckConfig]);
  
  const handleStudyDeck = useCallback(async (deck: Deck) => {
    setCurrentStudiedDeck(deck);
    const { data, error } = await supabase.from('flashcards').select('*').eq('deck_id', deck.id);

    if (error) {
      setError(`Error fetching cards: ${getErrorMessage(error)}`);
      throw error;
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
  }, [setError]);

  const handleEditDeck = useCallback(async (deck: Deck) => {
    setAppState(AppState.GENERATING);
    const { data, error } = await supabase.from('flashcards').select('*').eq('deck_id', deck.id);

    if (error) {
      setError(`Error fetching cards for editing: ${getErrorMessage(error)}`);
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
    setEditingDeck(deck);
    setAppState(AppState.EDITING);
  }, []);

  const handleUpdateDeck = useCallback(async (editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string) => {
    if (!user || !editingDeck || !deckConfig) return;
    
    const taskId = Date.now();
    generationTask.current = taskId;
    setAppState(AppState.SAVING_DECK);
    
    if (newTitle !== editingDeck.title) {
      const { error: deckUpdateError } = await supabase
        .from('decks')
        .update({ title: newTitle })
        .eq('id', editingDeck.id);

      if (deckUpdateError) {
        if (generationTask.current === taskId) {
          setError(`Error updating deck title: ${getErrorMessage(deckUpdateError)}`);
          setAppState(AppState.EDITING);
        }
        return;
      }
    }

    const { error: deleteError } = await supabase.from('flashcards').delete().eq('deck_id', editingDeck.id);
    if (deleteError) {
       if (generationTask.current === taskId) {
        setError(`Error updating deck (card deletion step): ${getErrorMessage(deleteError)}`);
        setAppState(AppState.EDITING);
      }
      return;
    }

    const flashcardsToInsert = editedCards.map(card => {
      const base = { deck_id: editingDeck.id, question: card.question };
      if (deckConfig.mode === GameMode.CLASSIC) {
        return { ...base, answer: (card as ClassicFlashcard).answer };
      }
      return { ...base, options: (card as QuizFlashcard).options, correct_answer: (card as QuizFlashcard).correctAnswer };
    });

    if (flashcardsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('flashcards').insert(flashcardsToInsert);
      if (insertError) {
        if (generationTask.current === taskId) {
          setError(`Error updating deck (card insertion step): ${getErrorMessage(insertError)}`);
          setAppState(AppState.EDITING);
        }
        return;
      }
    }

    if (generationTask.current === taskId) {
      setFlashcards([]);
      setEditingDeck(null);
      setDeckConfig(null);
      setAppState(AppState.YOUR_CARDS);
    }
  }, [user, editingDeck, deckConfig]);

  const handleSessionComplete = useCallback(async (results: StudyResult[]) => {
    if (user && currentStudiedDeck) {
        const correctCount = results.filter(r => r.isCorrect).length;
        const totalCards = results.length;
        const scorePercentage = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

        const { error: sessionError } = await supabase.from('study_sessions').insert({
            user_id: user.id,
            deck_id: currentStudiedDeck.id,
            score_percentage: scorePercentage,
            correct_count: correctCount,
            total_cards: totalCards,
        });

        if (sessionError) {
            console.error('Error saving study session:', getErrorMessage(sessionError));
        }
    }
    setStudyResults(results);
    setAppState(AppState.RESULTS);
  }, [user, currentStudiedDeck]);

  const handleInviteToLobby = useCallback(async (inviteeId: string) => {
    setError(null);
    try {
        const { data, error: rpcError } = await supabase.rpc('create_lobby_and_invite', {
            invitee_id: inviteeId
        });
        if (rpcError) throw rpcError;
        
        if (data && data.length > 0) {
            setCurrentLobby(data[0]);
            setAppState(AppState.COOP_LOBBY);
        } else {
            throw new Error("Failed to create lobby: No data returned.");
        }
    } catch (err) {
        setError(`Failed to create lobby: ${getErrorMessage(err)}`);
    }
  }, []);

  const handleRestart = useCallback(() => {
    setStudyResults([]);
    setAppState(AppState.STUDYING);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const renderContent = () => {
    if (loadingInitial) {
      return <LoadingView title="CardZap" message="Connecting..." />;
    }

    if (!user) {
        return <LoginPage onSignIn={handleSignIn} onSignUp={handleSignUp} onContinueAsGuest={handleContinueAsGuest} error={error} />;
    }

    switch (appState) {
      case AppState.FORM:
        return <SetupForm onSubmit={handleFormSubmit} error={error} onBack={handleBackToDecks} />;
        
      case AppState.GENERATING_NEW_DECK:
        return <LoadingView title="Generating Your Flashcards..." message="The AI is working its magic. This might take a moment." onCancel={handleBackToDecks} />;
        
      case AppState.SAVING_DECK:
        return <LoadingView title="Saving Your Deck..." message="Please wait while we store your new cards." />;
        
      case AppState.GENERATING:
        return <LoadingView title="Loading Deck..." message="Getting your cards ready for you." />;

      case AppState.EDITING:
        if (!deckConfig) return <p>Error: Deck configuration is missing.</p>;
        return <EditCardsView 
                  initialCards={flashcards} 
                  deckConfig={deckConfig} 
                  onComplete={editingDeck ? handleUpdateDeck : handleSaveDeckAndStudy} 
                  onBack={editingDeck ? handleBackToDecks : () => setAppState(AppState.FORM)}
                  isNewDeck={!editingDeck}
                  user={user}
                  onStartGuestSession={handleStartGuestStudySession}
                  error={error}
                  clearError={clearError}
                />;
                
      case AppState.STUDYING:
        if (!deckConfig) return <p>Error: Deck configuration is missing.</p>;
        return <StudySession 
                  cards={flashcards} 
                  mode={deckConfig.mode} 
                  color={deckConfig.color}
                  title={deckConfig.title}
                  onSessionComplete={handleSessionComplete}
                  onExit={handleBackToDecks}
               />;
               
      case AppState.RESULTS:
        if (!deckConfig) return <p>Error: Deck configuration is missing.</p>;
        return <ResultsScreen 
                  results={studyResults} 
                  onRestart={handleRestart}
                  onBackToDecks={handleBackToDecks}
                  title={deckConfig.title}
               />;
      
      case AppState.COOP_LOBBY:
        if (!currentLobby) return <LoadingView title="Redirecting..." message="Lobby not found." />;
        return <CoopLobbyPage 
                  user={user} 
                  lobby={currentLobby} 
                  members={lobbyMembers} 
                  onLeaveLobby={() => handleNavigate(AppState.YOUR_FRIENDS)} 
                  onStartGame={() => setAppState(AppState.COOP_GAME)}
               />;

      case AppState.COOP_GAME:
        if (!currentLobby) return <LoadingView title="Redirecting..." message="Lobby not found." />;
        return <CoopGamePage 
                 lobby={currentLobby} 
                 members={lobbyMembers} 
                 onLeaveGame={() => handleNavigate(AppState.YOUR_FRIENDS)}
               />;

      case AppState.ADMIN_DASHBOARD:
      case AppState.YOUR_CARDS:
      case AppState.PROFILE:
      case AppState.SUBJECTS:
      case AppState.STUDENT_SUBJECTS:
      case AppState.STUDENT_SUBJECT_DECKS:
      case AppState.SUBJECT_ROOM:
      case AppState.YOUR_FRIENDS:
        let pageContent;
        if (appState === AppState.ADMIN_DASHBOARD) {
          pageContent = <AdminDashboard />;
        } else if (appState === AppState.YOUR_CARDS) {
          pageContent = <YourCardsPage 
                          user={user}
                          onCreateNew={handleStartCreateNew} 
                          onStudyDeck={handleStudyDeck}
                          onEditDeck={handleEditDeck}
                          error={error}
                        />;
        } else if (appState === AppState.PROFILE) {
          pageContent = <ProfilePage user={user} />;
        } else if (appState === AppState.SUBJECTS) {
           pageContent = <SubjectsPage 
                            user={user} 
                            onNavigateToSubjectRoom={handleNavigateToSubjectRoom}
                          />;
        } else if (appState === AppState.STUDENT_SUBJECTS) {
           pageContent = <YourSubjectsPage 
                            user={user} 
                            onViewDecks={handleNavigateToStudentDecks}
                          />;
        } else if (appState === AppState.STUDENT_SUBJECT_DECKS && currentSubject) {
          pageContent = <StudentSubjectDecksPage 
                            subject={currentSubject} 
                            user={user}
                            onBack={() => handleNavigate(AppState.STUDENT_SUBJECTS)}
                            onStudyDeck={handleStudyDeck}
                          />;
        } else if (appState === AppState.SUBJECT_ROOM && currentSubject) {
          pageContent = <SubjectRoomPage user={user} subject={currentSubject} onBack={() => handleNavigate(AppState.SUBJECTS)} />;
        } else if (appState === AppState.YOUR_FRIENDS) {
          pageContent = <YourFriendsPage user={user} onInviteToLobby={handleInviteToLobby} />;
        } else if ((appState === AppState.SUBJECT_ROOM || appState === AppState.STUDENT_SUBJECT_DECKS) && !currentSubject) {
          handleNavigate(user.role === UserRole.STUDENT ? AppState.STUDENT_SUBJECTS : AppState.SUBJECTS);
          return <LoadingView title="Redirecting..." message="No subject selected."/>;
        }

        return (
          <DashboardLayout user={user} onLogout={handleLogout} activePage={appState} onNavigate={handleNavigate}>
            {pageContent}
          </DashboardLayout>
        );

      default:
        return (
             <DashboardLayout user={user} onLogout={handleLogout} activePage={AppState.YOUR_CARDS} onNavigate={handleNavigate}>
                <YourCardsPage 
                    user={user}
                    onCreateNew={handleStartCreateNew} 
                    onStudyDeck={handleStudyDeck}
                    onEditDeck={handleEditDeck}
                    error={"Invalid application state. Navigated to safety."}
                />
            </DashboardLayout>
        );
    }
  };

  const isDashboard = user && [AppState.ADMIN_DASHBOARD, AppState.YOUR_CARDS, AppState.PROFILE, AppState.SUBJECTS, AppState.STUDENT_SUBJECTS, AppState.STUDENT_SUBJECT_DECKS, AppState.SUBJECT_ROOM, AppState.YOUR_FRIENDS, AppState.COOP_LOBBY, AppState.COOP_GAME].includes(appState);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDashboard ? 'bg-primary-100' : 'bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center p-4'}`}>
      <Suspense fallback={<LoadingView title="Loading Page..." message="Getting things ready for you." />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};

export default App;
