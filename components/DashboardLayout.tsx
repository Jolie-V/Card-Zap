
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { UserRole } from '../types';
import SideTray from './SideTray';
import { MenuIcon, UserIcon, LogoutIcon, CheckCircleIcon, CloseIcon, HandTapIcon, GameControllerIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import CountdownOverlay from './CountdownOverlay';

interface DashboardLayoutProps {
    message?: string | null;
    onDismissMessage?: () => void;
}

const TransientMessage: React.FC<{ message: string; onDismiss: () => void; }> = ({ message, onDismiss }) => (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4 animate-[fade-in-down_0.5s_ease-out]">
        <style>{`
             @keyframes fade-in-down {
                from { opacity: 0; transform: translateY(-20px) translateX(-50%); }
                to { opacity: 1; transform: translateY(0) translateX(-50%); }
            }
        `}</style>
        <div className="bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-600 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg relative shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                <span className="font-semibold">{message}</span>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-green-200/50 dark:hover:bg-green-800/50">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const UserMenu: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-left p-1 rounded-full hover:bg-primary-200/50 dark:hover:bg-gray-700/50 transition-colors">
                 {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                 ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                    </div>
                 )}
                <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-primary-700 dark:text-gray-200 truncate max-w-[150px]">{user.full_name}</p>
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 border border-primary-200 dark:border-gray-600 animate-[fade-in_0.1s_ease-out]">
                     <style>{`
                        @keyframes fade-in {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div className="p-4 border-b border-primary-200 dark:border-gray-600">
                        <p className="text-sm font-semibold text-primary-700 dark:text-gray-100 truncate">{user.full_name}</p>
                        <p className="text-xs text-primary-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                        {user.role !== UserRole.ADMIN && (
                            <button onClick={() => { navigate('/profile'); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-primary-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-gray-600">
                               <UserIcon className="w-5 h-5" />
                               <span>Profile</span>
                            </button>
                        )}
                        <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-primary-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-gray-600">
                            <LogoutIcon className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const GameInviteModal: React.FC<{ inviterName: string; onAccept: () => void; onDecline: () => void }> = ({ inviterName, onAccept, onDecline }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
        <style>{`
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-in-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border-2 border-primary-400 dark:border-primary-600 animate-[slide-in-up_0.3s_ease-out] relative">
            <div className="w-20 h-20 bg-primary-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <GameControllerIcon className="w-10 h-10 text-primary-600 dark:text-primary-300" />
            </div>
            <h2 className="text-2xl font-extrabold text-primary-700 dark:text-gray-100 mb-2">Study Invite!</h2>
            <p className="text-lg text-primary-600 dark:text-gray-300 mb-8">
                <span className="font-bold text-primary-800 dark:text-white">{inviterName}</span> is inviting you to study.
            </p>
            <div className="flex gap-4">
                <button onClick={onDecline} className="flex-1 py-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    Decline
                </button>
                <button onClick={onAccept} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5">
                    Accept
                </button>
            </div>
        </div>
    </div>
);

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ message, onDismissMessage }) => {
    const { user } = useAuth();
    const [isSideTrayOpen, setIsSideTrayOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    // Invite Logic
    const [inviteData, setInviteData] = useState<{ id: number, senderName: string, roomId: number } | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    
    // Use a Ref to store the Room ID during acceptance to survive async race conditions
    const pendingRoomIdRef = useRef<number | null>(null);
    const isAcceptingRef = useRef(false);

    const pageTitle = useMemo(() => {
        const path = location.pathname.split('/')[1] || 'your-cards';
        return path.replace(/-/g, ' ').replace('your ', '');
    }, [location.pathname]);

    // 1. Listen for NEW invites
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('game-invites-insert')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`,
                },
                async (payload) => {
                    const newNotification = payload.new;
                    if (newNotification.type === 'game_invite') {
                        // Fetch the sender's name
                        const { data: senderData } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', newNotification.actor_id)
                            .single();
                        
                        const senderName = senderData?.full_name ? senderData.full_name.split(' ')[0] : 'Someone';
                        setInviteData({ 
                            id: newNotification.id, 
                            senderName,
                            roomId: newNotification.related_entity_id
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // 2. Listen for CANCELLATION of current invite
    useEffect(() => {
        if (!inviteData) return;

        const channel = supabase
            .channel(`invite-cancel-watch-${inviteData.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `id=eq.${inviteData.id}`, // Listen specifically to this invite ID
                },
                () => {
                    // Invite deleted (cancelled by sender or handled locally)
                    // CRITICAL FIX: Do NOT close if we are currently accepting or counting down
                    if (!showCountdown && !isAcceptingRef.current) {
                        setInviteData(null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [inviteData, showCountdown]);

    const handleAcceptInvite = async () => {
        if (!inviteData) return;
        
        isAcceptingRef.current = true;
        pendingRoomIdRef.current = inviteData.roomId; // Store ID safely

        try {
            // Trigger the game start via RPC (updates status, sets timestamp, deletes notification)
            const { error } = await supabase.rpc('start_game', { p_room_id: inviteData.roomId });
            if (error) throw error;

            // Start local countdown visualization
            setShowCountdown(true);
        } catch (err) {
            console.error("Error accepting game:", err);
            // Fallback cleanup if needed
            await supabase.from('notifications').delete().eq('id', inviteData.id);
            setInviteData(null);
            isAcceptingRef.current = false;
            pendingRoomIdRef.current = null;
        }
    };

    const handleDeclineInvite = async () => {
        if (!inviteData) return;
        await supabase.from('notifications').delete().eq('id', inviteData.id);
        setInviteData(null);
    };

    const handleCountdownFinish = () => {
        const roomId = pendingRoomIdRef.current || inviteData?.roomId;
        
        if (roomId) {
            setShowCountdown(false); 
            setInviteData(null); 
            isAcceptingRef.current = false;
            pendingRoomIdRef.current = null;
            navigate(`/game/${roomId}`);
        } else if (location.pathname.includes('/game/')) {
             // Already navigated via other means
             setShowCountdown(false);
        } else {
             // Fallback
             setShowCountdown(false);
             setInviteData(null);
             isAcceptingRef.current = false;
        }
    };

    // Merge prop message with local status message
    const displayMessage = message || statusMessage;
    const handleDismiss = message ? onDismissMessage : () => setStatusMessage(null);

    return (
        <div className="min-h-screen bg-primary-100 dark:bg-gray-900 text-primary-700 font-sans flex">
            {showCountdown && <CountdownOverlay onFinish={handleCountdownFinish} />}
            
            {inviteData && !showCountdown && (
                <GameInviteModal 
                    inviterName={inviteData.senderName} 
                    onAccept={handleAcceptInvite} 
                    onDecline={handleDeclineInvite} 
                />
            )}
            
            <SideTray 
                isOpen={isSideTrayOpen}
                setIsOpen={setIsSideTrayOpen}
            />
            <div className="flex-1 flex flex-col transition-all duration-300 lg:ml-64">
                <header className="p-4 flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-primary-200 dark:border-gray-700 sticky top-0 z-10">
                    <button onClick={() => setIsSideTrayOpen(true)} className="lg:hidden text-primary-600 dark:text-primary-300">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-primary-700 dark:text-gray-100 capitalize">
                           {pageTitle}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <UserMenu />
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 relative">
                     {displayMessage && handleDismiss && <TransientMessage message={displayMessage} onDismiss={handleDismiss} />}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
