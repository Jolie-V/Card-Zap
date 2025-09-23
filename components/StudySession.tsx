import React, { useState, useCallback } from 'react';
import { CardColor, ClassicFlashcard, GameMode, QuizFlashcard, StudyResult } from '../types';
import ClassicCard from './ClassicCard';
import QuizCard from './QuizCard';

interface StudySessionProps {
  cards: (ClassicFlashcard | QuizFlashcard)[];
  mode: GameMode;
  color: CardColor;
  title: string;
  onSessionComplete: (results: StudyResult[]) => void;
}

const StudySession: React.FC<StudySessionProps> = ({ cards, mode, color, title, onSessionComplete }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [results, setResults] = useState<StudyResult[]>([]);

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
    <div className="w-full flex flex-col items-center">
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