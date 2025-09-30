import React, { useState } from 'react';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard } from '../types';
import { TrashIcon, PlusCircleIcon } from './icons';

interface EditCardsViewProps {
  initialCards: (ClassicFlashcard | QuizFlashcard)[];
  deckConfig: { title: string; color: CardColor; mode: GameMode };
  onComplete: (editedCards: (ClassicFlashcard | QuizFlashcard)[], newTitle: string) => void;
  onBack: () => void;
  isNewDeck: boolean;
}

const EditCardsView: React.FC<EditCardsViewProps> = ({ initialCards, deckConfig, onComplete, onBack, isNewDeck }) => {
  const [cards, setCards] = useState<(ClassicFlashcard | QuizFlashcard)[]>(initialCards);
  const [title, setTitle] = useState(deckConfig.title);

  const handleCardChange = (index: number, field: string, value: string | string[], optionIndex?: number) => {
    const newCards = [...cards];
    const cardToUpdate = { ...newCards[index] };

    if (deckConfig.mode === GameMode.QUIZ && 'options' in cardToUpdate) {
        if (field === 'options' && optionIndex !== undefined && typeof value === 'string') {
            const newOptions = [...cardToUpdate.options];
            const oldOptionValue = newOptions[optionIndex];
            newOptions[optionIndex] = value;
            if (cardToUpdate.correctAnswer === oldOptionValue) {
                (cardToUpdate as QuizFlashcard).correctAnswer = value;
            }
            (cardToUpdate as QuizFlashcard).options = newOptions;
        } else if (field === 'correctAnswer' && typeof value === 'string') {
            (cardToUpdate as QuizFlashcard).correctAnswer = value;
        } else {
            (cardToUpdate as any)[field] = value;
        }
    } else {
        (cardToUpdate as any)[field] = value;
    }
    
    newCards[index] = cardToUpdate;
    setCards(newCards);
  };

  const handleDeleteCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };
  
  const handleAddCard = () => {
    if (deckConfig.mode === GameMode.CLASSIC) {
      const newCard: ClassicFlashcard = { question: 'New Question', answer: 'New Answer' };
      setCards([...cards, newCard]);
    } else {
      const newCard: QuizFlashcard = { question: 'New Question', options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'], correctAnswer: 'Option 1' };
      setCards([...cards, newCard]);
    }
  };
  
  const handleSave = () => {
    if (!title.trim()) {
        alert("Deck title cannot be empty.");
        return;
    }
    onComplete(cards, title);
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
          {isNewDeck ? 'Review & Create Deck' : 'Edit Your Deck'}
        </h1>
        <p className="text-primary-500">{isNewDeck ? 'Fine-tune your deck before you start studying.' : 'Update your deck title and cards.'}</p>
      </div>

      <div className="mb-6">
        <label htmlFor="deck-title" className="block text-sm font-medium text-primary-600 mb-2">Deck Title</label>
        <input
            id="deck-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 5: Photosynthesis"
            className="w-full bg-white border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
            required
        />
      </div>

      <div className="space-y-4 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md relative group animate-[fade-in-up_0.5s_ease-out] transition-all border border-primary-200" style={{ animationDelay: `${index * 50}ms` }}>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <button
              onClick={() => handleDeleteCard(index)}
              className="absolute top-3 right-3 text-primary-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete card"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
            <h3 className="text-primary-500 font-bold mb-2">Card {index + 1}</h3>
            
            <div className="space-y-4">
              <textarea
                value={card.question}
                onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                placeholder="Question"
                rows={2}
                className="w-full bg-primary-100 border border-primary-300 rounded-md px-3 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />

              {deckConfig.mode === GameMode.CLASSIC && 'answer' in card && (
                <textarea
                  value={card.answer}
                  onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full bg-primary-100 border border-primary-300 rounded-md px-3 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              )}

              {deckConfig.mode === GameMode.QUIZ && 'options' in card && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary-600">Options (Select the correct one)</p>
                  {(card as QuizFlashcard).options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                       <input
                         type="radio"
                         name={`correct-answer-${index}`}
                         checked={option === card.correctAnswer}
                         onChange={() => handleCardChange(index, 'correctAnswer', option)}
                         className="form-radio h-5 w-5 text-green-500 bg-primary-200 border-primary-400 focus:ring-green-500 cursor-pointer"
                       />
                       <input
                        type="text"
                        value={option}
                        onChange={(e) => handleCardChange(index, 'options', e.target.value, optIndex)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="w-full bg-primary-100 border border-primary-300 rounded-md px-3 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
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
            onClick={onBack}
            className="w-full sm:w-auto text-lg font-bold bg-primary-200 text-primary-600 rounded-lg py-3 px-6 transition-colors hover:bg-primary-300/80"
          >
            Back
        </button>
        <button
          onClick={handleAddCard}
          className="flex items-center justify-center gap-2 w-full sm:w-auto text-lg font-bold bg-primary-300 text-primary-600 rounded-lg py-3 px-6 transition-colors hover:bg-primary-400/80"
        >
          <PlusCircleIcon className="w-6 h-6" />
          Add Card
        </button>
        <button
          onClick={handleSave}
          className="w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700"
        >
          {isNewDeck ? 'Start Study Session' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default EditCardsView;
