import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Friend, FriendRequest, StudentProfile } from '../types';
import { ProfileAvatar, SearchIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';

interface YourFriendsPageProps {
    user: User;
}

type Tab = 'friends' | 'search' | 'requests';

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

const YourFriendsPage: React.FC<YourFriendsPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<StudentProfile[]>([]);
    
    const [loading, setLoading] = useState({ friends: true, requests: true, search: false });
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchFriendsAndRequests = useCallback(async () => {
        setLoading(prev => ({ ...prev, friends: true, requests: true }));
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_friends_and_requests');
            
            if (rpcError) throw rpcError;

            // The RPC function returns a single JSON object with two arrays
            if (data) {
                setFriends(data.friends || []);
                setRequests(data.requests || []);
            } else {
                setFriends([]);
                setRequests([]);
            }

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(prev => ({ ...prev, friends: false, requests: false }));
        }
    }, []);
    
    useEffect(() => {
        fetchFriendsAndRequests();
    }, [fetchFriendsAndRequests]);

    const handleSearch = useCallback(async (term: string) => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }
        setLoading(prev => ({...prev, search: true}));
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('search_students', {
                search_term: term
            });
            if (rpcError) throw rpcError;
            setSearchResults(data || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(prev => ({...prev, search: false}));
        }
    }, []);

    useEffect(() => {
        handleSearch(debouncedSearchTerm);
    }, [debouncedSearchTerm, handleSearch]);

    const handleSendRequest = async (receiverId: string) => {
        setError(null);
        try {
            // Ensure consistent ordering of user IDs to prevent duplicate friendships
            const [user1_id, user2_id] = [user.id, receiverId].sort();

            const { error: insertError } = await supabase.from('friendships').insert({
                user1_id,
                user2_id,
                requester_id: user.id,
                status: 'pending',
            });
            if (insertError) throw insertError;

            // Remove user from search results optimistically
            setSearchResults(prev => prev.filter(p => p.id !== receiverId));
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleAcceptRequest = async (friendshipId: number) => {
        setError(null);
        try {
             const { error: updateError } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', friendshipId);
            if (updateError) throw updateError;
            await fetchFriendsAndRequests(); // Re-fetch to update both lists
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDeclineOrRemove = async (friendshipId: number) => {
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendshipId);
            if (deleteError) throw deleteError;
             await fetchFriendsAndRequests(); // Re-fetch to update lists
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'friends':
                return <FriendsList members={friends} onRemove={handleDeclineOrRemove} isLoading={loading.friends} />;
            case 'search':
                return <StudentSearchList 
                            members={searchResults} 
                            onAdd={handleSendRequest} 
                            isLoading={loading.search}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                        />;
            case 'requests':
                return <RequestsList members={requests} onAccept={handleAcceptRequest} onDecline={handleDeclineOrRemove} isLoading={loading.requests} />;
            default:
                return null;
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
                <h1 className="text-4xl font-bold text-primary-700">Your Friends</h1>
                <p className="text-primary-500 mt-1">Connect with other students and study together.</p>
            </div>
            
            {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

            <div className="border-b border-primary-300 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <TabButton label="Friends" isActive={activeTab === 'friends'} onClick={() => setActiveTab('friends')} count={friends.length}/>
                    <TabButton label="Search Students" isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
                    <TabButton label="Requests" isActive={activeTab === 'requests'} onClick={() => setActiveTab('requests')} count={requests.length}/>
                </nav>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-primary-200">
                {renderTabContent()}
            </div>
        </div>
    );
};

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; count?: number;}> = ({ label, isActive, onClick, count }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold transition-colors relative ${
            isActive
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-primary-400 hover:text-primary-600 hover:border-primary-400'
        }`}
    >
        <span>{label}</span>
        {count !== undefined && count > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {count}
            </span>
        )}
    </button>
);

const SearchBar: React.FC<{searchTerm: string, setSearchTerm: (term: string) => void}> = ({ searchTerm, setSearchTerm }) => (
    <div className="relative mb-6">
        <input 
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-primary-100 border border-primary-300 rounded-md pl-10 pr-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
    </div>
);

const FriendsList: React.FC<{members: Friend[], onRemove: (id: number) => void, isLoading: boolean}> = ({ members, onRemove, isLoading }) => {
    if (isLoading) return <p className="text-center text-primary-500 py-8">Loading friends...</p>;
    return (
        <div>
            {members.length === 0 ? (
                <p className="text-center text-primary-500 py-8">You haven't added any friends yet. Use the search tab to find students.</p>
            ) : (
                <ul className="divide-y divide-primary-200">
                    {members.map(member => (
                        <li key={member.friendship_id} className="py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <ProfileAvatar className="w-12 h-12" />
                                <div>
                                    <p className="font-semibold text-primary-700">{member.full_name}</p>
                                    <p className="text-sm text-primary-500">{member.course || 'No course specified'}</p>
                                </div>
                            </div>
                            <button onClick={() => onRemove(member.friendship_id)} className="font-semibold text-sm bg-red-100 text-red-700 rounded-md py-1.5 px-4 hover:bg-red-200">Remove</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const StudentSearchList: React.FC<{members: StudentProfile[], onAdd: (id: string) => void, isLoading: boolean, searchTerm: string, setSearchTerm: (term: string) => void}> = ({ members, onAdd, isLoading, searchTerm, setSearchTerm }) => (
     <div>
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        {isLoading ? (
             <p className="text-center text-primary-500 py-8">Searching...</p>
        ) : searchTerm && members.length === 0 ? (
            <p className="text-center text-primary-500 py-8">No students found matching your search.</p>
        ) : (
            <ul className="divide-y divide-primary-200">
                {members.map(member => (
                    <li key={member.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <ProfileAvatar className="w-12 h-12" />
                            <div>
                                <p className="font-semibold text-primary-700">{member.full_name}</p>
                                <p className="text-sm text-primary-500">{member.course || 'No course specified'}</p>
                            </div>
                        </div>
                        <button onClick={() => onAdd(member.id)} className="font-semibold text-sm bg-primary-200 text-primary-700 rounded-md py-1.5 px-4 hover:bg-primary-300">Request</button>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const RequestsList: React.FC<{members: FriendRequest[], onAccept: (id: number) => void, onDecline: (id: number) => void, isLoading: boolean}> = ({ members, onAccept, onDecline, isLoading }) => {
    if (isLoading) return <p className="text-center text-primary-500 py-8">Loading requests...</p>;
    return (
     <div>
        {members.length === 0 ? (
            <p className="text-center text-primary-500 py-8">You have no pending friend requests.</p>
        ) : (
            <ul className="divide-y divide-primary-200">
                {members.map(member => (
                    <li key={member.friendship_id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <ProfileAvatar className="w-12 h-12" />
                            <div>
                                <p className="font-semibold text-primary-700">{member.full_name}</p>
                                <p className="text-sm text-primary-500">{member.course || 'No course specified'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onDecline(member.friendship_id)} className="font-semibold text-sm bg-red-100 text-red-700 rounded-md py-1.5 px-4 hover:bg-red-200">Decline</button>
                            <button onClick={() => onAccept(member.friendship_id)} className="font-semibold text-sm bg-green-100 text-green-700 rounded-md py-1.5 px-4 hover:bg-green-200">Accept</button>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
    );
};


export default YourFriendsPage;