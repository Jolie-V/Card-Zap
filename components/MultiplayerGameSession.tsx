
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';
import { QuizFlashcard, CardColor } from '../types';
import { CARD_COLORS } from '../constants';
import LoadingView from './LoadingView';
import { CloseIcon, CheckCircleIcon, XCircleIcon, TrophyIcon, DoorExitIcon } from './icons';

interface GameState {
    phase: 'pending' | 'countdown' | 'playing' | 'finished';
    current_card_index: number;
    host_score: number;
    guest_score: number;
    round_answers: Record<string, string>; // { host: 'ans1', guest: 'ans2' }
    start_timestamp?: number;
}

const MultiplayerGameSession: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [cards, setCards] = useState<QuizFlashcard[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerRole, setPlayerRole] = useState<'host' | 'guest' | null>(null);
    const [timeLeft, setTimeLeft] = useState(10);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [opponentName, setOpponentName] = useState('Opponent');
    const [showRoundResults, setShowRoundResults] = useState(false);
    
    // Reactive Score Animations
    const [hostDelta, setHostDelta] = useState<number | null>(null);
    const [guestDelta, setGuestDelta] = useState<number | null>(null);
    const prevScores = useRef({ host: 0, guest: 0 });
    const prevRoundAnswers = useRef<Record<string, string>>({});
    
    // Ref to track current game state for subscription logic
    const gameStateRef = useRef<GameState | null>(null);
    const hasAnsweredRef = useRef(hasAnswered);

    // Sync refs
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { hasAnsweredRef.current = hasAnswered; }, [hasAnswered]);

    // Load Game Data
    useEffect(() => {
        if (!user || !roomId) return;

        const loadGame = async () => {
            try {
                const { data: room, error } = await supabase
                    .from('game_rooms')
                    .select('*')
                    .eq('id', parseInt(roomId))
                    .single();

                if (error) throw error;

                // Determine role
                const role = room.host_id === user.id ? 'host' : 'guest';
                setPlayerRole(role);
                
                // Get opponent name
                const opponentId = role === 'host' ? room.guest_id : room.host_id;
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', opponentId).single();
                if (profile) setOpponentName(profile.full_name.split(' ')[0]);

                setCards(room.cards || []);
                setGameState(room.game_state);
                
                // Initialize ref to current scores to prevent animation on load
                if (room.game_state) {
                    prevScores.current = { 
                        host: room.game_state.host_score, 
                        guest: room.game_state.guest_score 
                    };
                    prevRoundAnswers.current = room.game_state.round_answers || {};
                }
                
                setIsLoading(false);

            } catch (err) {
                console.error("Error loading game:", err);
                navigate('/your-cards');
            }
        };

        loadGame();
    }, [roomId, user, navigate]);

    // Watch Game State for Score Changes & Answers (Animation Logic)
    useEffect(() => {
        if (!gameState) return;

        const newHostScore = gameState.host_score;
        const newGuestScore = gameState.guest_score;
        const newAnswers = gameState.round_answers || {};
        const oldAnswers = prevRoundAnswers.current;

        // Detect if Host answered this tick
        const hostAnsweredNow = !oldAnswers['host'] && newAnswers['host'];
        if (hostAnsweredNow) {
            const diff = newHostScore - prevScores.current.host;
            // Show delta even if 0 to indicate "Wrong Answer"
            setHostDelta(diff);
            setTimeout(() => setHostDelta(null), 2000);
        } else if (newHostScore > prevScores.current.host) {
            // Fallback: Score increased without answer event detection (e.g. slight sync delay)
            setHostDelta(newHostScore - prevScores.current.host);
            setTimeout(() => setHostDelta(null), 2000);
        }

        // Detect if Guest answered this tick
        const guestAnsweredNow = !oldAnswers['guest'] && newAnswers['guest'];
        if (guestAnsweredNow) {
            const diff = newGuestScore - prevScores.current.guest;
            setGuestDelta(diff);
            setTimeout(() => setGuestDelta(null), 2000);
        } else if (newGuestScore > prevScores.current.guest) {
            setGuestDelta(newGuestScore - prevScores.current.guest);
            setTimeout(() => setGuestDelta(null), 2000);
        }

        // Update Refs
        prevScores.current = { host: newHostScore, guest: newGuestScore };
        prevRoundAnswers.current = newAnswers;

    }, [gameState]);

    // Realtime Sync
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`game-state-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `id=eq.${roomId}`,
                },
                (payload) => {
                    const newState = payload.new.game_state as GameState;
                    const currentState = gameStateRef.current;

                    if (currentState && newState.current_card_index > currentState.current_card_index) {
                        // New Round triggered. Delay the update to show results.
                        setShowRoundResults(true); // Reveal answers
                        setTimeout(() => {
                            setShowRoundResults(false); // Hide answers for next round
                            setGameState((prev) => {
                                // Reset round state immediately before applying new game state
                                setHasAnswered(false);
                                setSelectedOption(null);
                                setTimeLeft(10); 
                                prevRoundAnswers.current = {}; 
                                return newState;
                            });
                        }, 2000); // 2 second delay to see the answer
                    } else {
                        // Regular update (score change, opponent answer) - Apply immediately
                        setGameState(newState);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `id=eq.${roomId}`,
                },
                () => {
                    // Room deleted (session ended by host or cleanup)
                    navigate('/your-cards');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, navigate]);

    const handleTimeUp = useCallback(async () => {
        if (!playerRole || !roomId) return;
        // Submit 0 score
        setHasAnswered(true); // Prevent double submission locally
        await supabase.rpc('submit_game_answer', {
            p_room_id: parseInt(roomId),
            p_player_role: playerRole,
            p_score_add: 0,
            p_answer: 'TIMEOUT'
        });
    }, [playerRole, roomId]);

    // Timer Logic - Refined to prevent stutter and ensure it runs after answer
    useEffect(() => {
        // Only run timer if game is active and not showing results
        if (!gameState || !cards.length || gameState.current_card_index >= cards.length) return;
        
        // Use an interval that doesn't depend on timeLeft to prevent stuttering on re-renders
        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timerId);
                    return 0;
                }
                
                const newValue = prev - 1;
                
                // If time hits 0 and we haven't answered, trigger timeout
                if (newValue === 0 && !hasAnsweredRef.current) {
                    handleTimeUp();
                }
                
                return newValue;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [gameState?.current_card_index, cards.length, handleTimeUp]);

    const handleAnswer = async (option: string) => {
        if (hasAnswered || !playerRole || !roomId || !gameState) return;
        
        const currentCard = cards[gameState.current_card_index];
        if (!currentCard) return;

        setHasAnswered(true);
        setSelectedOption(option);

        const isCorrect = option === currentCard.correctanswer;
        
        // Scoring Rule: 
        // Correct Answer: Points = Time Left (1-10)
        // Incorrect Answer: Points = 0 (No speed bonus)
        const scoreToAdd = isCorrect ? timeLeft : 0;
        
        try {
            await supabase.rpc('submit_game_answer', {
                p_room_id: parseInt(roomId),
                p_player_role: playerRole,
                p_score_add: scoreToAdd,
                p_answer: option
            });
        } catch (err) {
            console.error("Error submitting answer:", err);
        }
    };

    const handleExit = async () => {
        if (roomId && window.confirm("Are you sure you want to exit? This will end the game for both players.")) {
            try {
                // Delete game room regardless of role to terminate session for everyone
                await supabase.from('game_rooms').delete().eq('id', parseInt(roomId));
            } catch (err) {
                console.error("Error cleaning up game room:", err);
                // Force navigation if delete fails
                navigate('/your-cards'); 
            }
        }
    };

    if (isLoading || !gameState) return <LoadingView title="Connecting to Room..." />;

    // --- GAME OVER SCREEN ---
    if (gameState.current_card_index >= cards.length) {
        const myScore = playerRole === 'host' ? gameState.host_score : gameState.guest_score;
        const oppScore = playerRole === 'host' ? gameState.guest_score : gameState.host_score;
        const isWinner = myScore > oppScore;
        const isTie = myScore === oppScore;

        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center border-4 border-yellow-400 relative overflow-hidden animate-[fade-in_0.5s]">
                    {isWinner && <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400 animate-pulse"></div>}
                    
                    <TrophyIcon className={`w-24 h-24 mx-auto mb-4 ${isWinner ? 'text-yellow-400 animate-bounce' : 'text-gray-400'}`} />
                    
                    <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">
                        {isWinner ? 'VICTORY!' : isTie ? 'DRAW!' : 'DEFEAT'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Good game!</p>

                    <div className="flex justify-center items-end gap-8 mb-8">
                        <div className="text-center">
                            <div className="text-sm font-bold text-gray-500 uppercase">You</div>
                            <div className={`text-5xl font-black ${isWinner ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>{myScore}</div>
                        </div>
                        <div className="text-2xl font-bold text-gray-400 mb-2">VS</div>
                        <div className="text-center">
                            <div className="text-sm font-bold text-gray-500 uppercase">{opponentName}</div>
                            <div className={`text-5xl font-black ${!isWinner && !isTie ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>{oppScore}</div>
                        </div>
                    </div>

                    <button onClick={handleExit} className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-all">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = cards[gameState.current_card_index];
    const colorConfig = CARD_COLORS[CardColor.Blue]; // Default for MP

    const getScoreDisplay = (role: 'host' | 'guest') => {
        const isMe = playerRole === role;
        const score = role === 'host' ? gameState.host_score : gameState.guest_score;
        const delta = role === 'host' ? hostDelta : guestDelta;
        
        return (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col items-center min-w-[100px] border border-white/20 relative">
                <span className="text-xs font-extrabold text-gray-500 tracking-wider">
                    {isMe ? 'YOU' : opponentName.toUpperCase()}
                </span>
                <span className={`text-3xl font-black transition-all ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {score}
                </span>
                {/* Reactive Floating Score */}
                {delta !== null && (
                    <span 
                        key={Date.now()} // Force re-render for animation restart
                        className={`absolute -bottom-8 text-2xl font-bold animate-[float-up_1.5s_ease-out_forwards] ${delta > 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {delta > 0 ? `+${delta}` : '+0'}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-100 to-primary-300 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <style>{`
                @keyframes float-up {
                    0% { opacity: 1; transform: translateY(0) scale(1); }
                    50% { transform: translateY(-20px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-40px) scale(1); }
                }
            `}</style>

            {/* Header / Scoreboard - Absolute Positioned at Top */}
            <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
                <div className="relative w-full flex justify-center items-start">
                    {/* Center Group: Host Score - Timer - Guest Score */}
                    <div className="flex items-center gap-4 sm:gap-12 pointer-events-auto">
                        {getScoreDisplay('host')}
                        
                        {/* Timer */}
                        <div className={`rounded-full w-20 h-20 flex items-center justify-center text-3xl font-black border-4 shadow-2xl transition-all z-20 ${timeLeft <= 3 ? 'border-red-500 text-red-500 bg-red-100 dark:bg-red-900/30 scale-110 animate-pulse' : 'border-primary-500 text-primary-600 bg-white dark:bg-gray-800'}`}>
                            {timeLeft}
                        </div>

                        {getScoreDisplay('guest')}
                    </div>

                    {/* Exit Button - Absolute Right */}
                    <div className="absolute right-0 top-0 pointer-events-auto">
                        <button 
                            onClick={handleExit}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 rounded-2xl shadow-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500 transition-all border border-white/20"
                            title="Exit Game"
                        >
                            <DoorExitIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Card Area - Centered in remaining space, adding padding-top to account for the header */}
            <div className="w-full max-w-2xl pt-24 animate-[slide-in-up_0.3s_ease-out] z-0 flex flex-col items-center justify-center min-h-[50vh]">
                <style>{`
                    @keyframes slide-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/50 dark:bg-gray-700/50 h-3 rounded-full mb-8 overflow-hidden backdrop-blur-sm shadow-inner">
                    <div 
                        className="bg-gradient-to-r from-primary-400 to-primary-600 h-full transition-all duration-500 ease-out rounded-full shadow-md" 
                        style={{ width: `${((gameState.current_card_index) / cards.length) * 100}%` }}
                    ></div>
                </div>

                {/* Question */}
                <div className={`${colorConfig.bg} w-full rounded-3xl shadow-2xl p-10 min-h-[200px] flex items-center justify-center text-center mb-8 border-b-8 border-black/10 transform transition-transform hover:scale-[1.01]`}>
                    <h2 className={`${colorConfig.text} text-2xl sm:text-4xl font-bold drop-shadow-md`}>{currentCard.question}</h2>
                </div>

                {/* Options */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentCard.options.map((option, idx) => {
                        const isSelected = selectedOption === option;
                        const isCorrectAnswer = option === currentCard.correctanswer;
                        let btnClass = "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-b-4 border-gray-200 dark:border-gray-600";
                        
                        if (showRoundResults) {
                            // Only show Correct/Incorrect during the result reveal phase
                            if (isCorrectAnswer) {
                                // Always show correct answer in Green
                                btnClass = "bg-green-500 text-white border-green-700 ring-4 ring-green-300 dark:ring-green-900 transform scale-[1.02]";
                            } else if (isSelected) {
                                // If selected and not correct, show Red
                                btnClass = "bg-red-500 text-white border-red-700 ring-4 ring-red-300 dark:ring-red-900 opacity-100";
                            } else {
                                // Dim others
                                btnClass = "bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent opacity-50";
                            }
                        } else if (hasAnswered) {
                            // Waiting phase: Show selection but hide correctness
                            if (isSelected) {
                                // Show selection state immediately (Neutral/Primary Color)
                                btnClass = "bg-primary-600 text-white border-primary-800 ring-4 ring-primary-300 dark:ring-primary-900 transform scale-[1.02]";
                            } else {
                                btnClass = "bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent opacity-50";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                disabled={hasAnswered}
                                className={`p-6 rounded-2xl font-bold text-xl text-left shadow-lg transition-all active:scale-95 active:border-b-0 active:translate-y-1 ${btnClass}`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>

                {/* Waiting Indicator */}
                {hasAnswered && !showRoundResults && (
                    <div className="mt-8 flex justify-center">
                        <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-lg animate-pulse flex items-center gap-3 shadow-xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            </div>
                            Waiting for {opponentName}...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiplayerGameSession;
