import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult, UserRole, Deck } from '../types';
import ClassicCard from './ClassicCard';
import QuizCard from './QuizCard';
import StudyTutorial from './StudyTutorial';
import { CloseIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';
import LoadingView from './LoadingView';
import { getErrorMessage } from '../utils';

interface StudySessionProps {
  // Props are now optional
  cards?: (ClassicFlashcard | QuizFlashcard)[];
  mode?: GameMode;
  color?: CardColor;
  title?: string;
  onSessionComplete?: (results: StudyResult[]) => void;
  onExit?: () => void;
  showTutorial?: boolean;
  onTutorialComplete?: () => void;
}

const StudySession: React.FC<StudySessionProps> = (props) => {
  const { user } = useAuth();
  const { deckId, subjectId } = useParams<{ deckId: string, subjectId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState({
    cards: props.cards || [],
    deck: null as Deck | null,
    deckConfig: {
      title: props.title || '',
      color: props.color || 'blue' as CardColor,
      mode: props.mode || GameMode.CLASSIC
    },
    loading: !props.cards,
    error: null as string | null,
    showTutorial: props.showTutorial || false,
  });

  useEffect(() => {
    if (props.cards) return; // Prop-driven mode
    
    const loadData = async () => {
      setPageState(s => ({...s, loading: true, error: null}));
      try {
        if (deckId && user) { // Logged-in user
          const { data: deckData, error: deckError } = await supabase.from('decks').select('*').eq('id', parseInt(deckId, 10)).single();
          if (deckError) throw deckError;
          
          const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*').eq('deck_id', deckId);
          if (cardsError) throw cardsError;

          // Shuffle cards
          const shuffledCards = cardsData.sort(() => Math.random() - 0.5);

          setPageState(s => ({
            ...s,
            cards: shuffledCards,
            deck: deckData,
            deckConfig: { title: deckData.title, color: deckData.color, mode: deckData.mode },
            showTutorial: !localStorage.getItem('cardzap_tutorial_seen'),
          }));
        } else if (!user && location.state) { // Guest user
          const { cards, deckConfig, showTutorial } = location.state;
          if (cards && deckConfig) {
             setPageState(s => ({ ...s, cards, deckConfig, showTutorial }));
          } else {
            navigate('/guest/create', { replace: true });
          }
        } else {
           navigate(user ? '/your-cards' : '/login', { replace: true });
        }
      } catch (err) {
         setPageState(s => ({...s, error: getErrorMessage(err)}));
      } finally {
        setPageState(s => ({...s, loading: false}));
      }
    };
    loadData();
  }, [deckId, user, location.state, navigate, props.cards]);


  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [results, setResults] = useState<StudyResult[]>([]);

  const handleSessionComplete = async (finalResults: StudyResult[]) => {
      if (props.onSessionComplete) {
        return props.onSessionComplete(finalResults);
      }
      
      const correctCount = finalResults.filter(r => r.isCorrect).length;
      const total = finalResults.length;
      const score_percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      
      if (user && deckId && pageState.deck) {
          // Insert the session record
          const { error: sessionError } = await supabase.from('study_sessions').insert({
              user_id: user.id,
              deck_id: parseInt(deckId),
              score_percentage,
              correct_count: correctCount,
              total_cards: total,
              subject_id: subjectId ? parseInt(subjectId) : null,
          });

          if (sessionError) {
              console.error("Failed to insert study session record:", getErrorMessage(sessionError));
          }
      }

      navigate(user ? '/results' : '/guest/results', {
        state: { results: finalResults, deckConfig: pageState.deckConfig, deckId, subjectId }
      });
  };

  const handleExit = () => {
    if (props.onExit) return props.onExit();
    if (subjectId) navigate(`/your-subjects/${subjectId}`);
    else navigate(user ? '/your-cards' : '/guest/create');
  };

  const handleTutorialComplete = () => {
    setPageState(s => ({ ...s, showTutorial: false }));
    localStorage.setItem('cardzap_tutorial_seen', 'true');
  };

  const handleAnswer = useCallback(async (isCorrect: boolean) => {
    const newResult: StudyResult = { card: pageState.cards[currentCardIndex], isCorrect };
    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    setTimeout(() => {
        if (currentCardIndex + 1 < pageState.cards.length) {
            setCurrentCardIndex(currentCardIndex + 1);
        } else {
            handleSessionComplete(updatedResults);
        }
    }, pageState.deckConfig.mode === GameMode.QUIZ ? 1000 : 300);
  }, [currentCardIndex, pageState.cards, results, pageState.deckConfig.mode]);

  if (pageState.loading) return <LoadingView title="Loading Study Session..." />;
  if (pageState.error) return <div className="text-center p-8 text-red-500">{pageState.error}</div>;

  if (pageState.cards.length === 0) {
    return (
      <div className="w-full max-w-2xl text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700 animate-[fade-in_0.3s_ease-out]">
         <style>{`@keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-200 mb-4">Empty Deck</h2>
        <p className="text-primary-500 dark:text-gray-400 mb-6">There are no cards in this deck to study.</p>
        <button onClick={handleExit} className="font-semibold bg-primary-500 text-white rounded-md py-2 px-6 transition-colors hover:bg-primary-600">Back</button>
      </div>
    );
  }

  const currentCard = pageState.cards[currentCardIndex];
  const progress = ((currentCardIndex) / pageState.cards.length) * 100;

  return (
    <div className="w-full h-full flex flex-col items-center relative">
        {pageState.showTutorial && <StudyTutorial onClose={handleTutorialComplete} />}
        
        <div className="w-full flex-grow flex flex-col items-center">
            <button
                onClick={handleExit}
                className="absolute top-0 right-0 m-2 sm:m-0 text-primary-400 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-200 transition-colors z-10"
                aria-label="Exit study session"
            >
                <CloseIcon className="w-10 h-10" />
            </button>

            <div className="w-full max-w-2xl mb-4 flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 dark:text-gray-100">{pageState.deckConfig.title}</h1>
                <div className="flex justify-between items-center text-primary-500 dark:text-gray-400 mb-2">
                    <span>Card {currentCardIndex + 1} of {pageState.cards.length}</span>
                    <span>{results.filter(r => r.isCorrect).length} / {pageState.cards.length} Correct</span>
                </div>
                <div className="w-full bg-primary-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-primary-400 to-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        
            <div className="relative w-full flex-grow flex items-center justify-center">
                {pageState.deckConfig.mode === GameMode.CLASSIC ? (
                    <ClassicCard
                        card={currentCard as ClassicFlashcard}
                        onAnswer={handleAnswer}
                        color={pageState.deckConfig.color}
                        key={currentCardIndex}
                    />
                ) : (
                    <QuizCard
                        card={currentCard as QuizFlashcard}
                        onAnswer={handleAnswer}
                        color={pageState.deckConfig.color}
                        key={currentCardIndex}
                    />
                )}
            </div>
        </div>
    </div>
  );
};

export default StudySession;