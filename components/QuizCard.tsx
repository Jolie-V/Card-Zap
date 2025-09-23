
import React, { useState } from 'react';
import { CardColor, QuizFlashcard } from '../types';
import { CARD_COLORS } from '../constants';

interface QuizCardProps {
    card: QuizFlashcard;
    onAnswer: (isCorrect: boolean) => void;
    color: CardColor;
}

const QuizCard: React.FC<QuizCardProps> = ({ card, onAnswer, color }) => {
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleOptionClick = (option: string) => {
        if (isAnswered) return;
        
        const isCorrect = option === card.correctAnswer;
        setSelectedAnswer(option);
        setIsAnswered(true);
        onAnswer(isCorrect);
    };

    const colorClasses = CARD_COLORS[color];

    const getOptionClass = (option: string) => {
        if (!isAnswered) {
            return 'bg-slate-700 hover:bg-slate-600';
        }
        if (option === card.correctAnswer) {
            return 'bg-green-600 ring-2 ring-green-400';
        }
        if (option === selectedAnswer) {
            return 'bg-red-600 ring-2 ring-red-400';
        }
        return 'bg-slate-700 opacity-60';
    };

    return (
        <div className="w-full max-w-2xl flex flex-col items-center animate-[slide-in-up_0.4s_ease-out]">
            <style>{`
                @keyframes slide-in-up {
                    from { transform: translateY(50px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
            <div className={`w-full h-64 ${colorClasses.bg} rounded-2xl shadow-2xl p-8 flex items-center justify-center text-center mb-8`}>
                <p className={`text-2xl font-semibold ${colorClasses.text}`}>{card.question}</p>
            </div>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {card.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(option)}
                        disabled={isAnswered}
                        className={`p-4 rounded-lg text-left transition-all text-white text-lg ${getOptionClass(option)} disabled:cursor-not-allowed`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuizCard;
