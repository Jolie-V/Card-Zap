
import React, { useState, useEffect, useCallback } from 'react';
import { Deck, Subject, User } from '../types';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { CARD_COLORS } from '../constants';
import { RefreshIcon } from './icons';

interface StudentSubjectDecksPageProps {
    subject: Subject;
    user: User;
    onBack: () => void;
    onStudyDeck: (deck: Deck) => Promise<void>;
}

const DeckSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 animate-pulse">
        <div className="w-12 h-12 rounded-lg bg-primary-200 mb-4"></div>
        <div className="h-6 bg-primary-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-primary-200 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-primary-100 rounded-md w-full"></div>
    </div>
);

const StudentSubjectDecksPage: React.FC<StudentSubjectDecksPageProps> = ({ subject, user, onBack, onStudyDeck }) => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingDeckId, setLoadingDeckId] = useState<number | null>(null);
    
    const fetchDecks = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('subject_decks')
                .select('decks(*)')
                .eq('subject_id', subject.id)
                .abortSignal(controller.signal);

            if (fetchError) throw fetchError;

            const assignedDecks = data?.map(item => item.decks).filter(Boolean) as Deck[] || [];
            setDecks(assignedDecks);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Failed to load decks: The request timed out. Please check your connection.');
            } else {
                setError(`Failed to load decks for this subject. (Details: ${getErrorMessage(err)})`);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, [subject.id]);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

    const handleStudyClick = async (deck: Deck) => {
        setLoadingDeckId(deck.id);
        try {
            await onStudyDeck(deck);
        } catch (e) {
            console.error("Failed to start study session from subject decks page:", getErrorMessage(e));
            setError(getErrorMessage(e));
        } finally {
             setLoadingDeckId(null);
        }
    };

    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="mb-8">
                 <button onClick={onBack} className="text-primary-500 hover:text-primary-700 font-semibold mb-4">&larr; Back to Your Subjects</button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {subject.image_url ? (
                            <img src={subject.image_url} alt={subject.title} className="w-20 h-20 rounded-lg object-cover bg-primary-200" />
                        ) : (
                            <div className="w-20 h-20 rounded-lg bg-primary-200 flex-shrink-0"></div>
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-primary-700">{subject.title}</h1>
                            <p className="text-primary-500 mt-1">Study decks available for this subject.</p>
                        </div>
                    </div>
                     <button 
                        onClick={fetchDecks}
                        disabled={isLoading || loadingDeckId !== null}
                        className="flex self-start sm:self-center items-center justify-center gap-2 font-semibold bg-primary-200 text-primary-600 rounded-lg py-2 px-4 transition-all hover:bg-primary-300/80 disabled:opacity-50"
                    >
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Decks
                    </button>
                </div>
            </div>
            
            {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <DeckSkeleton key={i} />)}
                </div>
            ) : decks.length === 0 && !error ? (
                <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-primary-200">
                    <h2 className="text-2xl font-bold text-primary-600">No study decks yet!</h2>
                    <p className="text-primary-500 mt-2">Your teacher hasn't added any decks to this subject.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => {
                        const isLoadingThisDeck = loadingDeckId === deck.id;
                        const isAnyDeckLoading = loadingDeckId !== null;

                        return (
                        <div key={deck.id} className={`bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${isAnyDeckLoading && !isLoadingThisDeck ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div>
                                <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                                <h2 className="text-xl font-bold text-primary-700">{deck.title}</h2>
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

export default StudentSubjectDecksPage;