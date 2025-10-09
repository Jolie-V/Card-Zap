import React, { useState, useCallback } from 'react';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult } from '../types';
import ClassicCard from './ClassicCard';
import QuizCard from './QuizCard';
import { CloseIcon } from './icons';

interface StudySessionProps {
  cards: (ClassicFlashcard | QuizFlashcard)[];
  mode: GameMode;
  color: CardColor;
  title: string;
  onSessionComplete: (results: StudyResult[]) => void;
  onExit: () => void;
}

const StudySession: React.FC<StudySessionProps> = ({ cards, mode, color, title, onSessionComplete, onExit }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [results, setResults] = useState<StudyResult[]>([]);

  if (!cards || cards.length === 0) {
    return (
      <div className="w-full max-w-2xl text-center p-8 bg-white rounded-2xl shadow-xl border border-primary-200 animate-[fade-in_0.3s_ease-out]">
         <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `}</style>
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Empty Deck</h2>
        <p className="text-primary-500 mb-6">There are no cards in this deck to study.</p>
        <button
          onClick={onExit}
          className="font-semibold bg-primary-500 text-white rounded-md py-2 px-6 transition-colors hover:bg-primary-600"
        >
          Back to Decks
        </button>
      </div>
    );
  }

  const handleAnswer = useCallback((isCorrect: boolean) => {
    const newResult: StudyResult = { card: cards[currentCardIndex], isCorrect };
    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    setTimeout(() => {
        if (currentCardIndex + 1 < cards.length) {
            setCurrentCardIndex(currentCardIndex + 1);
        } else {
            onSessionComplete(updatedResults);
        }
    }, mode === GameMode.QUIZ ? 1000 : 300); // Shorter delay for drag
  }, [currentCardIndex, cards, results, onSessionComplete, mode]);

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex) / cards.length) * 100;

  return (
    <div className="w-full flex flex-col items-center relative">
        <button
            onClick={onExit}
            className="absolute top-0 right-0 m-2 sm:m-0 text-primary-400 hover:text-primary-600 transition-colors z-10"
            aria-label="Exit study session"
        >
            <CloseIcon className="w-10 h-10" />
        </button>

        <div className="w-full max-w-2xl mb-4">
            <h1 className="text-3xl font-bold text-center mb-2">{title}</h1>
            <div className="flex justify-between items-center text-primary-500 mb-2">
                <span>Card {currentCardIndex + 1} of {cards.length}</span>
                <span>{results.filter(r => r.isCorrect).length} / {results.length} Correct</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-primary-400 to-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      
        <div className="relative w-full h-[500px] flex items-center justify-center">
            {mode === GameMode.CLASSIC ? (
                <ClassicCard
                    card={currentCard as ClassicFlashcard}
                    onAnswer={handleAnswer}
                    color={color}
                    key={currentCardIndex}
                />
            ) : (
                <QuizCard
                    card={currentCard as QuizFlashcard}
                    onAnswer={handleAnswer}
                    color={color}
                    key={currentCardIndex}
                />
            )}
        </div>
    </div>
  );
};

export default StudySession;