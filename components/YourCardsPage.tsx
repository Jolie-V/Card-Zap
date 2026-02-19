
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CARD_COLORS } from '../constants';
import { Deck } from '../types';
import { PlusCircleIcon, EllipsisVerticalIcon, TrashIcon, RefreshIcon, SearchIcon, TrophyIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { useAuth } from './AuthProvider';
import ConfirmationModal from './ConfirmationModal';

interface YourCardsPageProps {
    error?: string | null;
}

const DeckSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 animate-pulse">
        <div className="w-12 h-12 rounded-lg bg-primary-200 dark:bg-gray-700 mb-4"></div>
        <div className="h-6 bg-primary-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-primary-100 dark:bg-gray-600 rounded-md w-full"></div>
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


const YourCardsPage: React.FC<YourCardsPageProps> = ({ error: appError }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);
    const [menuOpenForDeck, setMenuOpenForDeck] = useState<string | null>(null);
    const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const menuRef = useRef<HTMLDivElement>(null);

    const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchDecks = async () => {
            if (isMounted) {
                setIsLoading(true);
                setLocalError(null);
            }
            try {
                const term = debouncedSearchTerm.trim();
                
                // 1. Fetch decks
                let decksQuery = supabase
                    .from('decks')
                    .select('*')
                    .eq('user_id', user.id);

                if (term) {
                    decksQuery = decksQuery.ilike('title', `%${term}%`);
                }
                
                // Limit the query to the latest 50 decks to prevent slow loading
                const { data: decksData, error: decksError } = await decksQuery
                    .order('created_at', { ascending: false })
                    .limit(50)
                    .abortSignal(controller.signal);

                if (!isMounted) return;
                if (decksError) throw decksError;

                const fetchedDecks = decksData || [];
                if (fetchedDecks.length === 0) {
                    setDecks([]);
                    if (isMounted) setIsLoading(false);
                    return;
                }

                // 2. Fetch all study sessions for the user to calculate scores
                // This 'in' clause is safe because fetchedDecks is limited to 50
                const { data: sessionsData, error: sessionsError } = await supabase
                    .from('study_sessions')
                    .select('deck_id, score_percentage')
                    .eq('user_id', user.id)
                    .in('deck_id', fetchedDecks.map(d => d.id));
                
                if (!isMounted) return;
                if (sessionsError) throw sessionsError;

                // 3. Process sessions to find max scores
                const scoresByDeckId = (sessionsData || []).reduce((acc, session) => {
                    if (session.deck_id === null) return acc;
                    const deckId = String(session.deck_id);
                    if (!acc[deckId] || session.score_percentage > acc[deckId]) {
                        acc[deckId] = session.score_percentage;
                    }
                    return acc;
                }, {} as Record<string, number>);
                
                // 4. Merge scores into decks
                const decksWithScores = fetchedDecks.map(deck => ({
                    ...deck,
                    highest_score: scoresByDeckId[String(deck.id)] ?? null,
                }));

                if (isMounted) {
                    setDecks(decksWithScores);
                }

            } catch (err: unknown) {
                 if (!isMounted) return;

                if (err instanceof Error && err.name === 'AbortError') {
                    console.error('Fetch decks timed out.');
                    setLocalError('Failed to load decks: The request timed out. Please check your connection.');
                } else {
                    console.error('Error fetching decks:', getErrorMessage(err));
                    setLocalError(`Failed to load your decks. (Details: ${getErrorMessage(err)})`);
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDecks();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [user, debouncedSearchTerm, refreshTrigger]);

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

    const handleMenuClick = (deckId: string) => {
        setMenuOpenForDeck(prev => (prev === deckId ? null : deckId));
    };
    
    const handleEdit = (deck: Deck) => {
        setMenuOpenForDeck(null);
        navigate(`/edit-deck/${deck.id}`);
    };

    const handleConfirmDelete = async () => {
        if (!deckToDelete || !user) return;
    
        setIsDeleting(true);
        setLocalError(null);
    
        try {
            const { error } = await supabase.rpc('delete_deck', {
                deck_id_to_delete: parseInt(deckToDelete.id, 10)
            });
    
            if (error) throw error;
    
            setDecks(prevDecks => prevDecks.filter(deck => deck.id !== deckToDelete.id));
            setDeckToDelete(null); // Close modal on success
        } catch (err) {
            setLocalError(`Failed to delete deck: ${getErrorMessage(err)}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStudyClick = async (deck: Deck) => {
        setLoadingDeckId(deck.id);
        navigate(`/study-deck/${deck.id}`);
    };

    const error = appError || localError;

    if (!user) return <p>Loading...</p>

    return (
        <>
            {deckToDelete && (
                <ConfirmationModal
                    title="Delete Deck"
                    message={`Are you sure you want to permanently delete "${deckToDelete.title}" and all its cards? This action cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => { setDeckToDelete(null); setLocalError(null); }}
                    confirmText="Delete Deck"
                    isConfirming={isDeleting}
                    error={localError}
                />
            )}
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
                            <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">
                                Your Cards
                            </h1>
                            <p className="text-primary-500 dark:text-gray-400 mt-1">Review your study sets or create a new one.</p>
                        </div>
                        <div className="flex w-full sm:w-auto items-center gap-2">
                            <button 
                                onClick={handleRefresh}
                                disabled={isLoading || loadingDeckId !== null}
                                className="p-3 text-primary-600 dark:text-gray-300 bg-primary-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50"
                                aria-label="Refresh cards"
                            >
                                <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={() => navigate('/create-deck')}
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
                            placeholder="Search your cards by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-primary-300 dark:border-gray-600 rounded-md pl-10 pr-4 py-3 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 dark:text-gray-500" />
                    </div>
                </div>
                
                {error && !deckToDelete && <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <DeckSkeleton key={i} />)}
                    </div>
                ) : decks.length === 0 && !error ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-200">
                            {debouncedSearchTerm ? 'No cards found' : 'No cards yet!'}
                        </h2>
                        <p className="text-primary-500 dark:text-gray-400 mt-2">
                            {debouncedSearchTerm ? `Your search for "${debouncedSearchTerm}" did not match any of your cards.` : 'Click "Create New Deck" to get started.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {decks.map((deck) => {
                            const isLoadingThisDeck = loadingDeckId === deck.id;
                            const isAnyDeckLoading = loadingDeckId !== null;

                            return (
                            <div key={deck.id} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative ${isAnyDeckLoading && !isLoadingThisDeck ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="absolute top-4 right-4">
                                    {deck.user_id === user.id && (
                                        <>
                                            <button
                                                onClick={() => handleMenuClick(deck.id)}
                                                disabled={isAnyDeckLoading}
                                                className="p-1 rounded-full text-primary-400 dark:text-gray-500 hover:bg-primary-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-gray-300 disabled:cursor-not-allowed"
                                                aria-label="Deck options"
                                            >
                                                <EllipsisVerticalIcon className="w-6 h-6" />
                                            </button>
                                            {menuOpenForDeck === deck.id && (
                                                <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-primary-200 dark:border-gray-600">
                                                    <button
                                                        onClick={() => handleEdit(deck)}
                                                        className="w-full text-left px-4 py-2 text-sm text-primary-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-gray-600"
                                                    >
                                                        Edit Deck
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setLocalError(null);
                                                            setDeckToDelete(deck);
                                                            setMenuOpenForDeck(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
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
                                    <h2 className="text-xl font-bold text-primary-700 dark:text-gray-200 pr-8">{deck.title}</h2>
                                    <div className="flex items-center text-sm text-primary-500 dark:text-gray-400 mt-2 gap-4">
                                        <span className="capitalize">{deck.mode.toLowerCase()} Mode</span>
                                        {deck.highest_score !== null && deck.highest_score !== undefined && (
                                            <>
                                                <span className="text-primary-300 dark:text-gray-600">|</span>
                                                <div className="flex items-center gap-1 text-yellow-500 dark:text-yellow-400 font-semibold">
                                                    <TrophyIcon className="w-4 h-4" />
                                                    <span>Best: {deck.highest_score}%</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {deck.is_assessment && (
                                        <span className="text-xs font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full mt-3 inline-block">
                                            Assessment
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleStudyClick(deck)}
                                    disabled={isAnyDeckLoading}
                                    className="mt-6 w-full font-semibold bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-md py-2 px-4 transition-colors hover:bg-primary-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-primary-100 dark:disabled:bg-gray-700"
                                >
                                    {isLoadingThisDeck ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-gray-300"></div>
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
        </>
    );
};

export default YourCardsPage;