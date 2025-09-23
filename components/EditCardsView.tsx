import React, { useState } from 'react';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard } from '../types';
import { TrashIcon, PlusCircleIcon } from './icons';

interface EditCardsViewProps {
  initialCards: (ClassicFlashcard | QuizFlashcard)[];
  deckConfig: { title: string; color: CardColor; mode: GameMode };
  onComplete: (editedCards: (ClassicFlashcard | QuizFlashcard)[]) => void;
}

const EditCardsView: React.FC<EditCardsViewProps> = ({ initialCards, deckConfig, onComplete }) => {
  const [cards, setCards] = useState<(ClassicFlashcard | QuizFlashcard)[]>(initialCards);

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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Review & Edit Flashcards
        </h1>
        <p className="text-slate-400">Fine-tune your deck before you start studying.</p>
      </div>

      <div className="space-y-4 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-slate-800 p-6 rounded-lg shadow-md relative group animate-[fade-in-up_0.5s_ease-out] transition-all" style={{ animationDelay: `${index * 50}ms` }}>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <button
              onClick={() => handleDeleteCard(index)}
              className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete card"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
            <h3 className="text-slate-400 font-bold mb-2">Card {index + 1}</h3>
            
            <div className="space-y-4">
              <textarea
                value={card.question}
                onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                placeholder="Question"
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              />

              {deckConfig.mode === GameMode.CLASSIC && 'answer' in card && (
                <textarea
                  value={card.answer}
                  onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                />
              )}

              {deckConfig.mode === GameMode.QUIZ && 'options' in card && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-300">Options (Select the correct one)</p>
                  {(card as QuizFlashcard).options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                       <input
                         type="radio"
                         name={`correct-answer-${index}`}
                         checked={option === card.correctAnswer}
                         onChange={() => handleCardChange(index, 'correctAnswer', option)}
                         className="form-radio h-5 w-5 text-green-500 bg-slate-600 border-slate-500 focus:ring-green-500 cursor-pointer"
                       />
                       <input
                        type="text"
                        value={option}
                        onChange={(e) => handleCardChange(index, 'options', e.target.value, optIndex)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <button
          onClick={handleAddCard}
          className="flex items-center justify-center gap-2 w-full sm:w-auto text-lg font-bold bg-slate-600 text-white rounded-lg py-3 px-6 transition-colors hover:bg-slate-500"
        >
          <PlusCircleIcon className="w-6 h-6" />
          Add Card
        </button>
        <button
          onClick={() => onComplete(cards)}
          className="w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg py-3 px-6 transition-all hover:from-blue-600 hover:to-purple-700"
        >
          Start Study Session
        </button>
      </div>
    </div>
  );
};

export default EditCardsView;
