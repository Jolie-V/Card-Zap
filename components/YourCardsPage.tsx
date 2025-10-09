
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_COLORS } from '../constants';
import { Deck, User } from '../types';
import { PlusCircleIcon, EllipsisVerticalIcon, TrashIcon, RefreshIcon, SearchIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';

interface YourCardsPageProps {
    user: User;
    onCreateNew: () => void;
    onStudyDeck: (deck: Deck) => Promise<void>;
    onEditDeck: (deck: Deck) => void;
    error: string | null;
}

const DeckSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 animate-pulse">
        <div className="w-12 h-12 rounded-lg bg-primary-200 mb-4"></div>
        <div className="h-6 bg-primary-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-primary-200 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-primary-100 rounded-md w-full"></div>
    </div>
);

// Custom hook for debouncing input
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const YourCardsPage: React.FC<YourCardsPageProps> = ({ user, onCreateNew, onStudyDeck, onEditDeck, error: appError }) => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);
    const [menuOpenForDeck, setMenuOpenForDeck] = useState<number | null>(null);
    const [loadingDeckId, setLoadingDeckId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchDecks = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        setIsLoading(true);
        setLocalError(null);
        try {
            let query;
            const term = debouncedSearchTerm.trim();

            if (term) {
                // Use RPC for searching, which respects RLS
                query = supabase.rpc('search_decks', { search_term: term });
            } else {
                // Fetch all decks the user can see (RLS is applied by Supabase)
                query = supabase
                    .from('decks')
                    .select('*')
                    .order('created_at', { ascending: false });
            }
            
            const { data, error: fetchError } = await query.abortSignal(controller.signal);

            if (fetchError) throw fetchError;
            
            // RPC search might not be ordered, so we sort client-side for consistency
            const sortedData = (data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setDecks(sortedData);

        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.error('Fetch decks timed out.');
                setLocalError('Failed to load decks: The request timed out. Please check your connection.');
            } else {
                console.error('Error fetching decks:', getErrorMessage(err));
                setLocalError(`Failed to load your decks. (Details: ${getErrorMessage(err)})`);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, [debouncedSearchTerm]);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

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

    const handleDeleteDeck = useCallback(async (deckId: number) => {
        setMenuOpenForDeck(null);
        if (!user) return;
        if (!window.confirm("Are you sure you want to permanently delete this deck and all its cards? This action cannot be undone.")) {
            return;
        }
        setLocalError(null);

        try {
            const { error } = await supabase.rpc('delete_deck', {
                deck_id_to_delete: deckId
            });

            if (error) throw error;

            setDecks(prevDecks => prevDecks.filter(deck => deck.id !== deckId));
        } catch (err) {
            console.error('Error deleting deck:', getErrorMessage(err));
            setLocalError(`Failed to delete the deck. Please try again. (Details: ${getErrorMessage(err)})`);
        }
    }, [user]);

    const handleStudyClick = async (deck: Deck) => {
        setLoadingDeckId(deck.id);
        try {
            await onStudyDeck(deck);
        } catch (e) {
            console.error("Failed to start study session from YourCardsPage:", getErrorMessage(e));
            setLoadingDeckId(null);
        }
    };

    const error = appError || localError;

    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary-700">
                            Your Decks
                        </h1>
                        <p className="text-primary-500 mt-1">Review your study sets or create a new one.</p>
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <button 
                            onClick={fetchDecks}
                            disabled={isLoading || loadingDeckId !== null}
                            className="p-3 text-primary-600 bg-primary-200 rounded-lg transition-colors hover:bg-primary-300/80 disabled:opacity-50"
                            aria-label="Refresh decks"
                        >
                            <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={onCreateNew}
                            disabled={loadingDeckId !== null || isLoading}
                            className="flex-grow flex items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50"
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                            Create New Deck
                        </button>
                    </div>
                </div>
                 <div className="relative">
                    <input 
                        type="text"
                        placeholder="Search your decks by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-primary-300 rounded-md pl-10 pr-4 py-3 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
                </div>
            </div>
            
            {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <DeckSkeleton key={i} />)}
                </div>
            ) : decks.length === 0 && !error ? (
                <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-primary-200">
                    <h2 className="text-2xl font-bold text-primary-600">
                        {debouncedSearchTerm ? 'No decks found' : 'No decks yet!'}
                    </h2>
                    <p className="text-primary-500 mt-2">
                         {debouncedSearchTerm ? `Your search for "${debouncedSearchTerm}" did not match any decks.` : 'Click "Create New Deck" to get started.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => {
                        const isLoadingThisDeck = loadingDeckId === deck.id;
                        const isAnyDeckLoading = loadingDeckId !== null;

                        return (
                        <div key={deck.id} className={`bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative ${isAnyDeckLoading && !isLoadingThisDeck ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className="absolute top-4 right-4">
                                {deck.user_id === user.id && (
                                    <>
                                        <button
                                            onClick={() => handleMenuClick(deck.id)}
                                            disabled={isAnyDeckLoading}
                                            className="p-1 rounded-full text-primary-400 hover:bg-primary-100 hover:text-primary-600 disabled:cursor-not-allowed"
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
                                                    onClick={() => handleDeleteDeck(deck.id)}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                   <TrashIcon className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </>
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
                                onClick={() => handleStudyClick(deck)}
                                disabled={isAnyDeckLoading}
                                className="mt-6 w-full font-semibold bg-primary-100 text-primary-600 rounded-md py-2 px-4 transition-colors hover:bg-primary-200 disabled:cursor-not-allowed disabled:bg-primary-100"
                            >
                                {isLoadingThisDeck ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                                        Loading...
                                    </div>
                                ) : (
                                    'Study Deck'
                                )}
                            </button>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

export default YourCardsPage;