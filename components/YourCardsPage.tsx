import React from 'react';
import { CARD_COLORS } from '../constants';
import { CardColor, GameMode } from '../types';
import { PlusCircleIcon } from './icons';


interface Deck {
    title: string;
    cardCount: number;
    mode: GameMode;
    color: CardColor;
}

const MOCK_DECKS: Deck[] = [
    { title: "Chapter 5: Photosynthesis", cardCount: 25, mode: GameMode.CLASSIC, color: CardColor.Green },
    { title: "World War II Dates", cardCount: 50, mode: GameMode.QUIZ, color: CardColor.Red },
    { title: "Spanish Vocabulary", cardCount: 100, mode: GameMode.CLASSIC, color: CardColor.Blue },
    { title: "Calculus Formulas", cardCount: 30, mode: GameMode.QUIZ, color: CardColor.Purple },
];


interface YourCardsPageProps {
    onCreateNew: () => void;
}

const YourCardsPage: React.FC<YourCardsPageProps> = ({ onCreateNew }) => {
    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-primary-700">
                        Your Decks
                    </h1>
                    <p className="text-primary-500 mt-1">Review your study sets or create a new one.</p>
                </div>
                <button 
                    onClick={onCreateNew}
                    className="flex mt-4 sm:mt-0 items-center justify-center gap-2 w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700"
                >
                    <PlusCircleIcon className="w-6 h-6" />
                    Create New Deck
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_DECKS.map((deck, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div>
                            <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                            <h2 className="text-xl font-bold text-primary-700">{deck.title}</h2>
                            <div className="flex items-center text-sm text-primary-500 mt-2 gap-4">
                                <span>{deck.cardCount} Cards</span>
                                <span className="capitalize">{deck.mode.toLowerCase()} Mode</span>
                            </div>
                        </div>
                        <button className="mt-6 w-full font-semibold bg-primary-100 text-primary-600 rounded-md py-2 px-4 transition-colors hover:bg-primary-200">
                            Study Deck
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default YourCardsPage;
