
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Friend, FriendRequest, CardColor, GameMode } from '../types';
import { getErrorMessage } from '../utils';
import { parseFile } from '../services/fileParser';
import { generateFlashcards } from '../services/geminiService';
import { CARD_COLORS } from '../constants';
import { ProfileAvatar, RefreshIcon, SearchIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon, CloseIcon, UserGroupIcon, BellIcon, CardsIcon } from './icons';
import CountdownOverlay from './CountdownOverlay';

type Tab = 'friends' | 'find' | 'requests';

interface InviteSetupModalProps {
    friend: Friend;
    onClose: () => void;
    onSend: (config: { title: string; content: string; cardCount: number; color: CardColor; mode: GameMode }) => Promise<void>;
}

const InviteSetupModal: React.FC<InviteSetupModalProps> = ({ friend, onClose, onSend }) => {
    const [content, setContent] = useState('');
    const [cardCount, setCardCount] = useState(10);
    const [fileName, setFileName] = useState<string | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            setIsProcessing(true);
            setError(null);
            try {
                const text = await parseFile(file);
                if (!text.trim()) throw new Error("File appears to be empty.");
                setContent(text);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) {
            setError("Please provide text or upload a file.");
            return;
        }
        setIsProcessing(true);
        try {
            // Default configuration
            let finalTitle = `Study Session with ${friend.full_name}`;
            if (fileName) {
               // Use filename as title if available
               finalTitle = fileName.replace(/\.[^/.]+$/, "");
            }

            await onSend({
                title: finalTitle,
                content,
                cardCount,
                color: CardColor.Blue, // Default Blue
                mode: GameMode.QUIZ // Default Quiz for multiplayer
            });
        } catch (err) {
            setError(getErrorMessage(err));
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fade-in_0.3s_ease-out]" onClick={onClose}>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                /* Custom Range Slider Styles */
                .range-slider {
                  -webkit-appearance: none;
                  width: 100%;
                  background: transparent;
                }
                .range-slider:focus {
                  outline: none;
                }
                .range-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 20px;
                  width: 20px;
                  border-radius: 50%;
                  background: #3A728E;
                  cursor: pointer;
                  margin-top: -8px;
                  box-shadow: 0 0 5px rgba(0,0,0,0.2);
                }
                .dark .range-slider::-webkit-slider-thumb {
                  background: #86B6C6;
                }
                .range-slider::-webkit-slider-runnable-track {
                  width: 100%;
                  height: 4px;
                  cursor: pointer;
                  background: #B7D9E2;
                  border-radius: 5px;
                }
                .dark .range-slider::-webkit-slider-runnable-track {
                  background: #1F5372;
                }
            `}</style>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-lg relative animate-[slide-in-up_0.3s_ease-out] border border-primary-200 dark:border-gray-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-primary-700 dark:text-gray-100">Invite {friend.full_name}</h2>
                    <button onClick={onClose} className="text-primary-400 hover:text-primary-600 dark:text-gray-400 dark:hover:text-gray-200"><CloseIcon className="w-6 h-6" /></button>
                </div>

                {error && <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-2">
                    {/* Content Input */}
                    <div>
                        <label className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Study Material</label>
                        <textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            placeholder="Paste notes here..." 
                            rows={6}
                            className="w-full bg-white dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-lg p-2.5 text-primary-800 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none mb-2 resize-none"
                        />
                        <div className="text-center text-primary-400 my-2">OR</div>
                        <label htmlFor="modal-file" className="flex justify-center items-center w-full px-4 py-2 bg-white dark:bg-gray-700 text-primary-500 dark:text-primary-300 rounded-md shadow-sm border border-primary-300 dark:border-gray-500 cursor-pointer hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors">
                            <span className="text-base leading-normal">{fileName || 'Upload a file (.txt, .pdf, .docx)'}</span>
                            <input id="modal-file" type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>

                    {/* Count */}
                    <div>
                        <label className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Number of Cards: {cardCount}</label>
                        <input 
                            type="range" 
                            min="5" 
                            max="30" 
                            value={cardCount} 
                            onChange={e => setCardCount(Number(e.target.value))} 
                            className="w-full h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer range-slider dark:bg-gray-700" 
                        />
                    </div>

                    <div className="pt-4">
                        <button type="submit" disabled={isProcessing} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:from-primary-600 hover:to-primary-800">
                            {isProcessing ? 'Generating Game...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const YourFriendsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    
    // Data State
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    
    // UI State
    const [friendSearchTerm, setFriendSearchTerm] = useState(''); // Local search
    const [globalSearchTerm, setGlobalSearchTerm] = useState(''); // DB search
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Invite State
    const [setupFriend, setSetupFriend] = useState<Friend | null>(null); // Controls the setup modal
    const [invitingFriend, setInvitingFriend] = useState<Friend | null>(null); // Controls the "Waiting" modal
    const [currentInviteId, setCurrentInviteId] = useState<number | null>(null);
    const [gameRoomId, setGameRoomId] = useState<number | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Watch for the game room status changing to 'countdown' (Guest Accepted)
    useEffect(() => {
        if (!gameRoomId) return;

        const channel = supabase
            .channel(`room-status-${gameRoomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `id=eq.${gameRoomId}`,
                },
                (payload) => {
                    const newState = payload.new;
                    // When status changes to countdown, hide the waiting modal and show countdown
                    if (newState.game_state && newState.game_state.phase === 'countdown') {
                        setInvitingFriend(null);
                        setShowCountdown(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [gameRoomId]);

    // Initial Load: Get Friends and Incoming Requests
    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: rpcError } = await supabase.rpc('get_friends_and_requests');
                if (rpcError) throw rpcError;
                
                if (isMounted) {
                    setFriends(data.friends || []);
                    setRequests(data.requests || []);
                }
            } catch (err) {
                if (isMounted) {
                    setError(`Failed to load data: ${getErrorMessage(err)}`);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [user, refreshTrigger]);

    // Fetch global students (refactored for reuse)
    const fetchGlobalStudents = useCallback(async (term: string) => {
        setIsSearching(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('search_students', {
                search_term: term
            });

            if (rpcError) throw rpcError;
            
            // Filter out self
            const filtered = (data || []).filter((s: any) => s.id !== user?.id);
            setGlobalSearchResults(filtered);

        } catch (err) {
            setError(`Search failed: ${getErrorMessage(err)}`);
        } finally {
            setIsSearching(false);
        }
    }, [user?.id]);

    // Auto-load students when switching to 'find' tab
    useEffect(() => {
        if (activeTab === 'find') {
            // Trigger search with current term (or empty string for all)
            fetchGlobalStudents(globalSearchTerm.trim());
        }
    }, [activeTab, fetchGlobalStudents]);

    // Derived State: Filtered Friends (Local Search)
    const filteredFriends = useMemo(() => {
        if (!friendSearchTerm.trim()) return friends;
        return friends.filter(f => 
            f.full_name.toLowerCase().includes(friendSearchTerm.toLowerCase()) || 
            (f.course && f.course.toLowerCase().includes(friendSearchTerm.toLowerCase()))
        );
    }, [friends, friendSearchTerm]);

    // Action: Search Global Students
    const handleGlobalSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        // Allow empty search to reset list to "all" (limit 20)
        await fetchGlobalStudents(globalSearchTerm.trim());
    };

    // Action: Send Request
    const sendRequest = async (targetId: string) => {
        if (!user) return;
        setActionLoadingId(targetId);
        try {
            const user1 = user.id < targetId ? user.id : targetId;
            const user2 = user.id < targetId ? targetId : user.id;

            const { error: insertError } = await supabase
                .from('friendships')
                .insert({
                    user1_id: user1,
                    user2_id: user2,
                    requester_id: user.id,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            // Optimistic UI update
            setGlobalSearchResults(prev => prev.filter(s => s.id !== targetId));
            
        } catch (err) {
            setError(`Failed to send request: ${getErrorMessage(err)}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Action: Accept Request
    const handleAccept = async (friendshipId: number) => {
        setActionLoadingId(friendshipId);
        try {
            const { error: updateError } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', friendshipId);

            if (updateError) throw updateError;
            handleRefresh();
        } catch (err) {
            setError(`Failed to accept request: ${getErrorMessage(err)}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Action: Remove Friend or Deny Request
    const handleRemoveOrDeny = async (friendshipId: number, isDeny: boolean) => {
        if (!isDeny && !window.confirm("Are you sure you want to remove this friend?")) return;
        
        setActionLoadingId(friendshipId);
        try {
            const { error: deleteError } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId);

            if (deleteError) throw deleteError;
            handleRefresh();
        } catch (err) {
            setError(`Failed to process action: ${getErrorMessage(err)}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Action 1: Open Setup Modal
    const initiateInvite = (friend: Friend) => {
        setSetupFriend(friend);
        setError(null);
    };

    // Action 2: Generate Cards -> Create Room -> Send Invite
    const handleCreateGameAndInvite = async (config: { title: string; content: string; cardCount: number; color: CardColor; mode: GameMode }) => {
        if (!user || !setupFriend) return;
        
        try {
            // 1. Generate Cards using AI
            // Force Quiz mode for multiplayer for better gameplay
            const generatedCards = await generateFlashcards(config.content, config.cardCount, GameMode.QUIZ);

            // 2. Create Game Room Entry with Cards
            const { data: roomData, error: roomError } = await supabase
                .from('game_rooms')
                .insert({
                    host_id: user.id,
                    guest_id: setupFriend.id,
                    config: config, 
                    cards: generatedCards, // Store the generated cards directly in the room
                    status: 'pending'
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // 3. Create Notification linking to this room
            const { data: notifData, error: notifError } = await supabase
                .from('notifications')
                .insert({
                    recipient_id: setupFriend.id,
                    actor_id: user.id,
                    type: 'game_invite',
                    related_entity_id: roomData.id,
                    metadata: { title: config.title, mode: GameMode.QUIZ }, 
                })
                .select()
                .single();

            if (notifError) throw notifError;
            
            // 4. Transition UI
            setGameRoomId(roomData.id);
            setCurrentInviteId(notifData.id);
            setInvitingFriend(setupFriend); // Show waiting modal
            setSetupFriend(null); // Close setup modal

        } catch (err) {
            console.error(err);
            throw new Error(`Failed to create game: ${getErrorMessage(err)}`); 
        }
    };

    const handleCancelInvite = async () => {
        if (!currentInviteId) {
            setInvitingFriend(null);
            return;
        }

        try {
            await supabase.from('notifications').delete().eq('id', currentInviteId);
            // Optionally update game room to cancelled
            if (gameRoomId) {
                await supabase.from('game_rooms').delete().eq('id', gameRoomId);
            }
        } catch (err) {
            console.error("Failed to cancel invite:", err);
        } finally {
            setInvitingFriend(null);
            setCurrentInviteId(null);
            setGameRoomId(null);
        }
    };

    // Handle Countdown Finish -> Redirect to Game
    const handleCountdownFinish = () => {
        if (gameRoomId) {
            navigate(`/game/${gameRoomId}`);
        }
    };

    // Helper to check relationship status for global search results
    const getRelationshipStatus = (studentId: string) => {
        if (friends.some(f => f.id === studentId)) return 'friend';
        if (requests.some(r => r.id === studentId)) return 'incoming';
        return 'none';
    };

    if (!user) return null;

    return (
        <>
            {showCountdown && <CountdownOverlay onFinish={handleCountdownFinish} />}

            {/* 1. Setup Modal */}
            {setupFriend && (
                <InviteSetupModal 
                    friend={setupFriend}
                    onClose={() => setSetupFriend(null)}
                    onSend={handleCreateGameAndInvite}
                />
            )}

            {/* 2. Waiting Modal */}
            {invitingFriend && !showCountdown && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fade-in_0.3s_ease-out]"
                    onClick={handleCancelInvite} 
                >
                    <div 
                        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center relative animate-[slide-in-up_0.3s_ease-out] border border-primary-200 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-primary-700 dark:text-gray-100 mb-6">Invite Sent</h2>
                        
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-400 dark:bg-blue-600 rounded-full blur-md opacity-50 animate-pulse"></div>
                                <div className="relative bg-white dark:bg-gray-800 rounded-full p-1">
                                    {invitingFriend.avatar_url ? (
                                        <img src={invitingFriend.avatar_url} alt={invitingFriend.full_name} className="w-20 h-20 rounded-full object-cover" />
                                    ) : (
                                        <ProfileAvatar className="w-20 h-20" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="text-primary-600 dark:text-gray-300 mb-8 text-lg">
                            Waiting for <span className="font-bold text-primary-700 dark:text-gray-100">{invitingFriend.full_name.split(' ')[0]}</span> to accept...
                        </p>
                        
                        <button
                            onClick={handleCancelInvite}
                            className="w-full py-3 px-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                            Cancel Invite
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">Friends</h1>
                        <p className="text-primary-500 dark:text-gray-400 mt-1">Connect, share decks, and study together.</p>
                    </div>
                    <button onClick={handleRefresh} disabled={isLoading} className="p-3 text-primary-600 dark:text-gray-300 bg-primary-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Refresh">
                        <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        {error}
                        <button onClick={() => setError(null)} className="absolute top-3 right-3 text-red-700 dark:text-red-300">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-primary-300 dark:border-gray-600 mb-6 gap-6 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('friends')}
                        className={`flex items-center gap-2 pb-3 font-semibold transition-colors relative whitespace-nowrap ${
                            activeTab === 'friends'
                                ? 'text-primary-600 dark:text-primary-300 border-b-2 border-primary-500'
                                : 'text-primary-400 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-200'
                        }`}
                    >
                        <UserGroupIcon className="w-5 h-5" />
                        My Friends ({friends.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('find')}
                        className={`flex items-center gap-2 pb-3 font-semibold transition-colors relative whitespace-nowrap ${
                            activeTab === 'find'
                                ? 'text-primary-600 dark:text-primary-300 border-b-2 border-primary-500'
                                : 'text-primary-400 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-200'
                        }`}
                    >
                        <SearchIcon className="w-5 h-5" />
                        Find Students
                    </button>
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`flex items-center gap-2 pb-3 font-semibold transition-colors relative whitespace-nowrap ${
                            activeTab === 'requests'
                                ? 'text-primary-600 dark:text-primary-300 border-b-2 border-primary-500'
                                : 'text-primary-400 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-200'
                        }`}
                    >
                        <BellIcon className="w-5 h-5" />
                        Requests
                        {requests.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>}
                    </button>
                </div>

                {/* Tab Content 1: My Friends */}
                {activeTab === 'friends' && (
                    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                        {friends.length > 0 && (
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Search your friends..."
                                    value={friendSearchTerm}
                                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 border border-primary-300 dark:border-gray-600 rounded-md pl-10 pr-4 py-3 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                                />
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 dark:text-gray-500" />
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700">
                            {friends.length === 0 ? (
                                <div className="text-center py-8 text-primary-500 dark:text-gray-400">
                                    <p className="mb-4">You haven't added any friends yet.</p>
                                    <button onClick={() => setActiveTab('find')} className="text-primary-600 dark:text-primary-300 font-bold hover:underline bg-primary-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                                        Find people to add
                                    </button>
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No friends match "{friendSearchTerm}".</div>
                            ) : (
                                <ul className="divide-y divide-primary-200 dark:divide-gray-700">
                                    {filteredFriends.map(friend => (
                                        <li key={friend.friendship_id} className="py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                {friend.avatar_url ? (
                                                    <img src={friend.avatar_url} alt={friend.full_name} className="w-12 h-12 rounded-full object-cover border border-primary-200 dark:border-gray-600 flex-shrink-0" />
                                                ) : (
                                                    <ProfileAvatar className="w-12 h-12" />
                                                )}
                                                <div>
                                                    <p className="font-bold text-primary-700 dark:text-gray-100">{friend.full_name}</p>
                                                    <p className="text-sm text-primary-500 dark:text-gray-400">{friend.course || 'Student'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => initiateInvite(friend)}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary-600 dark:text-blue-300 bg-primary-100 dark:bg-blue-900/30 hover:bg-primary-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Invite</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveOrDeny(friend.friendship_id, false)}
                                                    disabled={actionLoadingId === friend.friendship_id}
                                                    className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Remove Friend"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Content 2: Find Students */}
                {activeTab === 'find' && (
                    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                        <form onSubmit={handleGlobalSearch} className="relative">
                            <input 
                                type="text"
                                placeholder="Search all students by name..."
                                value={globalSearchTerm}
                                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-primary-300 dark:border-gray-600 rounded-md pl-10 pr-24 py-3 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 dark:text-gray-500" />
                            <button 
                                type="submit" 
                                disabled={isSearching}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary-600 text-white rounded-md font-semibold text-sm hover:bg-primary-700 disabled:opacity-50"
                            >
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </form>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700">
                            {isSearching ? (
                                <div className="text-center py-8 text-primary-500 dark:text-gray-400">Searching...</div>
                            ) : globalSearchResults.length > 0 ? (
                                <ul className="divide-y divide-primary-200 dark:divide-gray-700">
                                    {globalSearchResults.map(student => {
                                        const status = getRelationshipStatus(student.id);
                                        return (
                                            <li key={student.id} className="py-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} alt={student.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                                    ) : (
                                                        <ProfileAvatar className="w-12 h-12" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-primary-700 dark:text-gray-100">{student.full_name}</p>
                                                        <p className="text-xs text-primary-500 dark:text-gray-400">{student.course}</p>
                                                    </div>
                                                </div>
                                                
                                                {status === 'friend' ? (
                                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                        Friends
                                                    </span>
                                                ) : status === 'incoming' ? (
                                                    <button 
                                                        onClick={() => setActiveTab('requests')}
                                                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        View Request
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => sendRequest(student.id)}
                                                        disabled={actionLoadingId === student.id}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <PlusCircleIcon className="w-4 h-4" />
                                                        Add
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    {globalSearchTerm ? `No students match "${globalSearchTerm}".` : "No other students found."}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Content 3: Friend Requests */}
                {activeTab === 'requests' && (
                    <div className="animate-[fade-in_0.3s_ease-out]">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700">
                            {requests.length === 0 ? (
                                <div className="text-center py-12 text-primary-500 dark:text-gray-400">
                                    <div className="bg-primary-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BellIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>No pending friend requests.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-primary-200 dark:divide-gray-700">
                                    {requests.map(req => (
                                        <li key={req.friendship_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                {req.avatar_url ? (
                                                    <img src={req.avatar_url} alt={req.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                                ) : (
                                                    <ProfileAvatar className="w-12 h-12" />
                                                )}
                                                <div>
                                                    <p className="font-bold text-primary-700 dark:text-gray-100">{req.full_name}</p>
                                                    <p className="text-sm text-primary-500 dark:text-gray-400">{req.course || 'Student'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 self-end sm:self-center">
                                                <button 
                                                    onClick={() => handleRemoveOrDeny(req.friendship_id, true)}
                                                    disabled={actionLoadingId === req.friendship_id}
                                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                                >
                                                    <CloseIcon className="w-4 h-4" />
                                                    Deny
                                                </button>
                                                <button 
                                                    onClick={() => handleAccept(req.friendship_id)}
                                                    disabled={actionLoadingId === req.friendship_id}
                                                    className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors flex items-center gap-2"
                                                >
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                    Accept
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default YourFriendsPage;
