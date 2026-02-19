
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard, UserRole } from '../types';
import { TrashIcon, PlusCircleIcon, CloseIcon } from './icons';
import { useAuth } from './AuthProvider';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import LoadingView from './LoadingView';

interface EditCardsViewProps {
  // Props are now optional as this component can fetch its own data.
  initialCards?: (ClassicFlashcard | QuizFlashcard)[];
  deckConfig?: { title: string; color: CardColor; mode: GameMode; is_assessment?: boolean };
  onComplete?: (editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string, isAssessment: boolean) => void;
  onBack?: () => void;
  isNewDeck?: boolean;
  onStartGuestSession?: (editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string) => void;
  error?: string | null;
  clearError?: () => void;
}

const EditCardsView: React.FC<EditCardsViewProps> = (props) => {
  const { user } = useAuth();
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState({ loading: true, error: null as string | null });
  const [cards, setCards] = useState<(ClassicFlashcard | QuizFlashcard)[]>(props.initialCards || []);
  const [deckConfig, setDeckConfig] = useState(props.deckConfig);
  const [title, setTitle] = useState(props.deckConfig?.title || '');
  const [isAssessment, setIsAssessment] = useState(props.deckConfig?.is_assessment || false);
  const [isNewDeck, setIsNewDeck] = useState(props.isNewDeck || false);

  useEffect(() => {
    // If component is used as a page, load data
    if (!props.initialCards) {
      const loadData = async () => {
        setPageState({ loading: true, error: null });
        try {
          if (deckId && user) { // Logged-in user flow
            const { data: deckData, error: deckError } = await supabase.from('decks').select('*').eq('id', deckId).single();
            if (deckError) throw deckError;
            if (deckData.user_id !== user.id) throw new Error("You do not have permission to edit this deck.");
            
            const { data: cardsData, error: cardsError } = await supabase.from('cards').select('*').eq('deck_id', deckId).order('id');
            if (cardsError) throw cardsError;

            setCards(cardsData || []);
            const config = { title: deckData.title, color: deckData.color, mode: deckData.mode, is_assessment: deckData.is_assessment };
            setDeckConfig(config);
            setTitle(config.title);
            setIsAssessment(config.is_assessment);
            setIsNewDeck(false);

          } else if (!user && location.state) { // Guest flow
            const { cards: stateCards, deckConfig: stateConfig, isNewDeck: stateIsNew } = location.state;
            if (stateCards && stateConfig) {
              setCards(stateCards);
              setDeckConfig(stateConfig);
              setTitle(stateConfig.title);
              setIsAssessment(stateConfig.is_assessment);
              setIsNewDeck(stateIsNew);
            } else {
              navigate('/guest/create', { replace: true });
            }
          } else {
             navigate(user ? '/your-cards' : '/login', { replace: true });
          }
        } catch (err) {
          setPageState(s => ({ ...s, error: getErrorMessage(err) }));
        } finally {
          setPageState(s => ({ ...s, loading: false }));
        }
      };
      loadData();
    } else {
      // If props are provided, component is not in page mode.
      setPageState({ loading: false, error: null });
    }
  }, [deckId, user, location.state, navigate, props.initialCards]);

  const handleCardChange = (index: number, field: string, value: string | string[], optionIndex?: number) => {
    const newCards = [...cards];
    const cardToUpdate = { ...newCards[index] } as QuizFlashcard; // Assume QuizFlashcard for type safety

    if (deckConfig?.mode === GameMode.QUIZ && 'options' in cardToUpdate) {
        if (field === 'options' && optionIndex !== undefined && typeof value === 'string') {
            const newOptions = [...cardToUpdate.options];
            const oldOptionValue = newOptions[optionIndex];
            newOptions[optionIndex] = value;
            if (cardToUpdate.correctanswer === oldOptionValue) {
                cardToUpdate.correctanswer = value;
            }
            cardToUpdate.options = newOptions;
        } else if (field === 'correctanswer' && typeof value === 'string') {
            cardToUpdate.correctanswer = value;
        } else {
            (cardToUpdate as any)[field] = value;
        }
    } else {
        (cardToUpdate as any)[field] = value;
    }
    
    newCards[index] = cardToUpdate;
    setCards(newCards);
  };

  const handleDeleteCard = (index: number) => setCards(cards.filter((_, i) => i !== index));
  
  const handleAddCard = () => {
    if (deckConfig?.mode === GameMode.CLASSIC) {
      setCards([...cards, { question: 'New Question', answer: 'New Answer' }]);
    } else {
      setCards([...cards, { question: 'New Question', options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'], correctanswer: 'Option 1' }]);
    }
  };

  const handleBack = () => navigate(user ? '/your-cards' : '/guest/create');
  
  const handleSave = async () => {
    if (!title.trim()) { alert("Deck title cannot be empty."); return; }
    
    if (deckId && user) { // Logged-in save
      setPageState(s => ({...s, error: null}));
      try {
        await supabase.rpc('update_deck_with_cards', {
            p_deck_id: parseInt(deckId),
            p_title: title,
            p_is_assessment: isAssessment,
            p_cards: cards,
        });
        navigate('/your-cards');
      } catch(err) {
        setPageState(s => ({...s, error: getErrorMessage(err)}));
      }
    } else if (!user) { // Guest save
      const updatedDeckConfig = { ...deckConfig, title: title };
      navigate('/guest/study', {
          state: { cards: cards, deckConfig: updatedDeckConfig, showTutorial: true }
      });
    }
  };

  const getButtonText = () => {
    if (isNewDeck) return user ? 'Save & Study' : 'Start Study Session';
    return 'Save Changes';
  };

  if (pageState.loading) return <LoadingView title="Loading Deck..." />;
  if (pageState.error && !deckConfig) return <div className="text-center p-8 text-red-500">{pageState.error}</div>;
  if (!deckConfig) return null;

  const error = props.error || pageState.error;
  const clearError = props.clearError || (() => setPageState(s => ({...s, error: null})));

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
          {isNewDeck ? 'Review & Create Deck' : 'Edit Your Deck'}
        </h1>
        <p className="text-primary-500 dark:text-primary-300">{isNewDeck ? 'Fine-tune your deck before you start studying.' : 'Update your deck title and cards.'}</p>
      </div>

       {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                {error}
                <button onClick={clearError} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close error">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-primary-200 dark:border-gray-700">
        <label htmlFor="deck-title" className="block text-sm font-medium text-primary-600 dark:text-primary-200 mb-2">Deck Title</label>
        <input
            id="deck-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5: Photosynthesis"
            className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
            required
        />
        {user?.role === UserRole.TEACHER && (
            <div className="mt-4 bg-primary-100 dark:bg-gray-700/50 p-4 rounded-lg">
                <label htmlFor="is-assessment" className="flex items-center justify-between cursor-pointer">
                    <div>
                        <span className="font-semibold text-primary-600 dark:text-primary-200">Mark as Assessment</span>
                        <p className="text-sm text-primary-500 dark:text-gray-400">Students get only one attempt. Scores will be recorded.</p>
                    </div>
                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isAssessment ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAssessment ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <input id="is-assessment" type="checkbox" className="sr-only" checked={isAssessment} onChange={(e) => setIsAssessment(e.target.checked)} />
                </label>
            </div>
        )}
      </div>

      <div className="space-y-4 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md relative group animate-[fade-in-up_0.5s_ease-out] transition-all border border-primary-200 dark:border-gray-700" style={{ animationDelay: `${index * 50}ms` }}>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <button
              onClick={() => handleDeleteCard(index)}
              className="absolute top-3 right-3 text-primary-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete card"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
            <h3 className="text-primary-500 dark:text-primary-400 font-bold mb-2">Card {index + 1}</h3>
            
            <div className="space-y-4">
              <textarea
                value={card.question}
                onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                placeholder="Question"
                rows={2}
                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-3 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />

              {deckConfig.mode === GameMode.CLASSIC && 'answer' in card && (
                <textarea
                  value={card.answer}
                  onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-3 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              )}

              {deckConfig.mode === GameMode.QUIZ && 'options' in card && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-200">Options (Select the correct one)</p>
                  {(card as QuizFlashcard).options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                       <input
                         type="radio"
                         name={`correct-answer-${index}`}
                         checked={option === (card as QuizFlashcard).correctanswer}
                         onChange={() => handleCardChange(index, 'correctanswer', option)}
                         className="form-radio h-5 w-5 text-green-500 bg-primary-200 dark:bg-gray-600 border-primary-400 dark:border-gray-500 focus:ring-green-500 cursor-pointer"
                       />
                       <input
                        type="text"
                        value={option}
                        onChange={(e) => handleCardChange(index, 'options', e.target.value, optIndex)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-3 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
         <button
            onClick={props.onBack || handleBack}
            className="w-full sm:w-auto text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-3 px-6 transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600"
          >
            Back
        </button>
        <button
          onClick={handleAddCard}
          className="flex items-center justify-center gap-2 w-full sm:w-auto text-lg font-bold bg-primary-300 dark:bg-gray-600 text-primary-600 dark:text-gray-200 rounded-lg py-3 px-6 transition-colors hover:bg-primary-400/80 dark:hover:bg-gray-500"
        >
          <PlusCircleIcon className="w-6 h-6" />
          Add Card
        </button>
        <button
          onClick={handleSave}
          className="w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default EditCardsView;