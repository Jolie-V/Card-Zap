import React, { useState, useEffect, useRef } from 'react';
import { CARD_COLORS } from '../constants';
import { Deck, GameMode } from '../types';
import { PlusCircleIcon, EllipsisVerticalIcon, TrashIcon } from './icons';

interface YourCardsPageProps {
    onCreateNew: () => void;
    decks: Deck[];
    onStudyDeck: (deck: Deck) => void;
    onEditDeck: (deck: Deck) => void;
    onDeleteDeck: (deckId: number) => void;
    error: string | null;
}

const YourCardsPage: React.FC<YourCardsPageProps> = ({ onCreateNew, decks, onStudyDeck, onEditDeck, onDeleteDeck, error }) => {
    const [menuOpenForDeck, setMenuOpenForDeck] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenForDeck(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMenuClick = (deckId: number) => {
        setMenuOpenForDeck(prev => (prev === deckId ? null : deckId));
    };
    
    const handleEdit = (deck: Deck) => {
        setMenuOpenForDeck(null);
        onEditDeck(deck);
    };

    const handleDelete = (deckId: number) => {
        setMenuOpenForDeck(null);
        onDeleteDeck(deckId);
    };

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
            
            {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

            {decks.length === 0 && !error ? (
                <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-primary-200">
                    <h2 className="text-2xl font-bold text-primary-600">No decks yet!</h2>
                    <p className="text-primary-500 mt-2">Click "Create New Deck" to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => (
                        <div key={deck.id} className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => handleMenuClick(deck.id)}
                                    className="p-1 rounded-full text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                                    aria-label="Deck options"
                                >
                                    <EllipsisVerticalIcon className="w-6 h-6" />
                                </button>
                                {menuOpenForDeck === deck.id && (
                                    <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-primary-200">
                                        <button
                                            onClick={() => handleEdit(deck)}
                                            className="w-full text-left px-4 py-2 text-sm text-primary-700 hover:bg-primary-100"
                                        >
                                            Edit Deck
                                        </button>
                                        <button
                                            onClick={() => handleDelete(deck.id)}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                           <TrashIcon className="w-4 h-4" /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                                <h2 className="text-xl font-bold text-primary-700 pr-8">{deck.title}</h2>
                                <div className="flex items-center text-sm text-primary-500 mt-2 gap-4">
                                    <span className="capitalize">{deck.mode.toLowerCase()} Mode</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => onStudyDeck(deck)}
                                className="mt-6 w-full font-semibold bg-primary-100 text-primary-600 rounded-md py-2 px-4 transition-colors hover:bg-primary-200">
                                Study Deck
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default YourCardsPage;
