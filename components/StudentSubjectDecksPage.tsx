import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Deck, Subject } from '../types';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { CARD_COLORS } from '../constants';
import { RefreshIcon, TrophyIcon } from './icons';
import { useAuth } from './AuthProvider';
import LoadingView from './LoadingView';


const DeckSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 animate-pulse">
        <div className="w-12 h-12 rounded-lg bg-primary-200 dark:bg-gray-700 mb-4"></div>
        <div className="h-6 bg-primary-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-primary-100 dark:bg-gray-600 rounded-md w-full"></div>
    </div>
);

const StudentSubjectDecksPage: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [subject, setSubject] = useState<Subject | null>(null);
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);
    
    useEffect(() => {
        if (!user || !subjectId) return;
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchData = async () => {
            if (isMounted) {
                setIsLoading(true);
                setError(null);
            }
            try {
                // 1. Fetch subject details
                const { data: subjectData, error: subjectError } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('id', parseInt(subjectId, 10))
                    .single();
                
                if (!isMounted) return;
                if (subjectError) throw subjectError;
                setSubject(subjectData);

                // 2. Get deck IDs for the subject
                const { data: subjectDecksData, error: subjectDecksError } = await supabase
                    .from('subject_decks')
                    .select('deck_id')
                    .eq('subject_id', parseInt(subjectId, 10))
                    .abortSignal(controller.signal);

                if (!isMounted) return;
                if (subjectDecksError) throw subjectDecksError;

                const deckIds = subjectDecksData.map(sd => sd.deck_id);
                if (deckIds.length === 0) {
                    setDecks([]);
                    if(isMounted) setIsLoading(false);
                    return;
                }
                
                // 3. Get the decks themselves
                const { data: decksData, error: decksError } = await supabase
                    .from('decks')
                    .select('*')
                    .in('id', deckIds)
                    .abortSignal(controller.signal);
                
                if (!isMounted) return;
                if (decksError) throw decksError;

                // 4. Get the scores for this user for these decks
                const { data: sessionsData, error: sessionsError } = await supabase
                    .from('study_sessions')
                    .select('deck_id, score_percentage')
                    .eq('user_id', user.id)
                    .in('deck_id', deckIds)
                    .abortSignal(controller.signal);
                
                if (!isMounted) return;
                if (sessionsError) throw sessionsError;

                // 5. Combine them
                const scoresByDeckId = (sessionsData || []).reduce((acc, session) => {
                    if (session.deck_id === null) return acc;
                    const deckId = String(session.deck_id);
                    if (!acc[deckId] || session.score_percentage > acc[deckId]) {
                        acc[deckId] = session.score_percentage;
                    }
                    return acc;
                }, {} as Record<string, number>);

                const decksWithStats: Deck[] = (decksData || []).map(deck => ({
                    ...deck,
                    highest_score: scoresByDeckId[String(deck.id)] || null,
                }));

                if (isMounted) {
                    setDecks(decksWithStats);
                }

            } catch (err: unknown) {
                if (!isMounted) return;
                if (err instanceof Error && err.name === 'AbortError') {
                    setError('Failed to load decks: The request timed out. Please check your connection.');
                } else {
                    setError(`Failed to load decks for this subject. (Details: ${getErrorMessage(err)})`);
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
        
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [subjectId, user, refreshTrigger]);

    const handleStudyClick = (deck: Deck) => {
        setLoadingDeckId(deck.id);
        navigate(`/study-subject-deck/${deck.id}/subject/${subjectId}`);
    };

    if (isLoading) {
        return <LoadingView title="Loading Subject Decks..." />;
    }

    if (error) {
        return <div className="text-center p-8 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;
    }

    if (!subject) {
        return <div className="text-center p-8">Subject not found.</div>;
    }


    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="mb-8">
                 <button onClick={() => navigate('/your-subjects')} className="text-primary-500 dark:text-gray-400 hover:text-primary-700 dark:hover:text-gray-200 font-semibold mb-4">&larr; Back to Your Subjects</button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {subject.image_url ? (
                            <img src={subject.image_url} alt={subject.title} className="w-20 h-20 rounded-lg object-cover bg-primary-200 dark:bg-gray-700" />
                        ) : (
                            <div className="w-20 h-20 rounded-lg bg-primary-200 dark:bg-gray-700 flex-shrink-0"></div>
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">{subject.title}</h1>
                            <p className="text-primary-500 dark:text-gray-400 mt-1">Study decks available for this subject.</p>
                        </div>
                    </div>
                     <button 
                        onClick={handleRefresh}
                        disabled={isLoading || loadingDeckId !== null}
                        className="flex self-start sm:self-center items-center justify-center gap-2 font-semibold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-4 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Decks
                    </button>
                </div>
            </div>
            
            {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

            {decks.length === 0 && !error ? (
                <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-primary-600 dark:text-gray-200">No study decks yet!</h2>
                    <p className="text-primary-500 dark:text-gray-400 mt-2">Your teacher hasn't added any decks to this subject.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => {
                        const isLoadingThisDeck = loadingDeckId === deck.id;
                        const isAnyDeckLoading = loadingDeckId !== null;

                        return (
                        <div key={deck.id} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${isAnyDeckLoading && !isLoadingThisDeck ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div>
                                <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                                <h2 className="text-xl font-bold text-primary-700 dark:text-gray-200">{deck.title}</h2>
                                <div className="flex items-center text-sm text-primary-500 dark:text-gray-400 mt-2 gap-4">
                                    <span className="capitalize">{deck.mode.toLowerCase()} Mode</span>
                                     {deck.highest_score !== null && deck.highest_score !== undefined && (
                                        <>
                                            <span className="text-primary-300 dark:text-gray-600">|</span>
                                            <div className="flex items-center gap-1 text-yellow-500 dark:text-yellow-400 font-semibold">
                                                <TrophyIcon className="w-4 h-4" />
                                                <span>Your Score: {deck.highest_score}%</span>
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
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentSubjectDecksPage;
