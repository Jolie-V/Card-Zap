
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { ProfileAvatar, RefreshIcon, ChartBarIcon, TableCellsIcon } from './icons';
import { getErrorMessage } from '../utils';
import { useAuth } from './AuthProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatCardProps {
    label: string;
    value: number | string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 w-full text-center">
        <p className="text-4xl font-bold text-primary-500 dark:text-primary-300">{value}</p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">{label}</p>
    </div>
);

interface SessionHistoryItem {
    id: number;
    deckTitle: string;
    score: number;
    correct: number;
    total: number;
    date: Date;
}

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ createdDecks: 0, createdSubjects: 0, scoreAverage: 0 });
    const [history, setHistory] = useState<SessionHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchStats = async () => {
            if (isMounted) {
                setLoading(true);
                setError(null);
            }

            try {
                // Optimize: Only fetch the count for decks, not the whole body
                const decksPromise = supabase
                    .from('decks')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .abortSignal(controller.signal);
                
                // Optimize: Join decks to get title directly, limit to 100
                const allSessionsPromise = supabase
                    .from('study_sessions')
                    .select('id, deck_id, score_percentage, completed_at, correct_count, total_cards, decks(title)')
                    .eq('user_id', user.id)
                    .order('completed_at', { ascending: false }) // Newest first
                    .limit(100)
                    .abortSignal(controller.signal);
                
                const teacherSubjectsPromise = user.role === UserRole.TEACHER
                    ? supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id).abortSignal(controller.signal)
                    : Promise.resolve({ count: 0, error: null, data: null, status: 200, statusText: 'OK' });


                const [decksResult, allSessionsResult, subjectsResult] = await Promise.all([decksPromise, allSessionsPromise, teacherSubjectsPromise]);

                if (!isMounted) return;

                if (decksResult.error) throw decksResult.error;
                if (allSessionsResult.error) throw allSessionsResult.error;
                if (subjectsResult && subjectsResult.error) {
                    throw subjectsResult.error;
                }
                
                const fetchedDecksCount = decksResult.count || 0;
                const allSessionsData = allSessionsResult.data || [];

                // --- STATS CALCULATION ---
                const createdDecks = fetchedDecksCount;
                const scoreAverage = allSessionsData.length > 0
                    ? Math.round(allSessionsData.reduce((acc, s) => acc + s.score_percentage, 0) / allSessionsData.length)
                    : 0;
                const createdSubjects = subjectsResult.count || 0;
                
                // --- HISTORY TABLE DATA PROCESSING ---
                const historyData: SessionHistoryItem[] = allSessionsData.map(session => ({
                    id: session.id,
                    // Use optional chaining and type assertion as Joined data structure can vary in TS
                    deckTitle: (session.decks as any)?.title || 'Unknown Deck', 
                    score: session.score_percentage,
                    correct: session.correct_count,
                    total: session.total_cards,
                    date: new Date(session.completed_at)
                }));
                
                if (isMounted) {
                    setStats({ createdDecks, createdSubjects, scoreAverage });
                    setHistory(historyData);
                }

            } catch (err: unknown) {
                if (!isMounted) return;

                if (err instanceof Error && err.name === 'AbortError') {
                    console.error('Profile stats fetch aborted.');
                    setError('Failed to load profile stats: The request timed out. Please check your connection.');
                } else {
                    console.error('Error fetching profile stats:', getErrorMessage(err));
                    setError(getErrorMessage(err));
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchStats();
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [user, refreshTrigger]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
        if (score >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    };

    // Prepare chart data: reverse chronological order to show progress over time
    const chartData = useMemo(() => {
        return [...history].reverse().map(item => ({
            ...item,
            timestamp: item.date.getTime()
        }));
    }, [history]);

    if (!user) return <p>Loading profile...</p>;
    
    return (
        <div className="max-w-4xl mx-auto w-full animate-[fade-in-up_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
             `}</style>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-8" role="alert">
                    <strong className="font-bold">Profile Error: </strong>
                    <span className="block sm:inline whitespace-pre-wrap">{error}</span>
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700 flex flex-col sm:flex-row items-center text-center sm:text-left gap-6 mb-8">
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover flex-shrink-0" />
                ) : (
                    <ProfileAvatar className="w-24 h-24" />
                )}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{user.full_name}</h2>
                    {user.role === UserRole.STUDENT ? (
                         <p className="text-gray-600 dark:text-gray-300 font-semibold">{user.course || 'Student'}</p>
                    ) : (
                         <p className="text-primary-500 dark:text-primary-300 font-semibold">{user.role}</p>
                    )}
                    <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
            </div>

            {user.role === UserRole.STUDENT ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StatCard label="Created Decks" value={loading ? '...' : stats.createdDecks} />
                        <StatCard label="Recent Avg Score" value={loading ? '...' : `${stats.scoreAverage}%`} />
                    </div>
                    
                    {/* Activity History Container */}
                    <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-primary-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Recent Activity</h3>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-primary-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                                    <button
                                        onClick={() => setViewMode('chart')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'chart' ? 'bg-white dark:bg-gray-600 shadow text-primary-700 dark:text-primary-200' : 'text-primary-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-300'}`}
                                        title="View Graph"
                                    >
                                        <ChartBarIcon className="w-4 h-4" />
                                        Graph
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow text-primary-700 dark:text-primary-200' : 'text-primary-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-300'}`}
                                        title="View Table"
                                    >
                                        <TableCellsIcon className="w-4 h-4" />
                                        Table
                                    </button>
                                </div>
                                <button 
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    className="flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-gray-300 bg-primary-100 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-gray-600 rounded-md py-1.5 px-3 transition-colors disabled:opacity-50"
                                >
                                    <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center">
                                <p className="text-gray-400 dark:text-gray-500">Loading history...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-center">
                                <p className="text-gray-400 dark:text-gray-500">No study sessions recorded yet. <br/> Start studying to track your progress!</p>
                            </div>
                        ) : viewMode === 'chart' ? (
                            <div className="h-80 w-full p-4">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'} />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            tickMargin={10}
                                        />
                                        <YAxis 
                                            domain={[0, 100]} 
                                            unit="%" 
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                                                borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb',
                                                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
                                                borderRadius: '0.5rem'
                                            }}
                                            labelFormatter={(label) => new Date(label).toLocaleString()}
                                            formatter={(value: number, name, props) => [`${value}%`, props.payload.deckTitle]}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="score" 
                                            stroke="#3B82F6" 
                                            strokeWidth={3}
                                            dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Score"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-primary-200 dark:divide-gray-700">
                                    <thead className="bg-primary-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Deck</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-primary-200 dark:divide-gray-700">
                                        {history.map((item) => (
                                            <tr key={item.id} className="hover:bg-primary-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                    {item.date.toLocaleDateString()} <span className="text-xs text-gray-400 ml-1">{item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {item.deckTitle}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                    {item.correct} / {item.total}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <span className={`px-2 py-1 rounded-full font-bold ${getScoreColor(item.score)}`}>
                                                        {item.score}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : ( // Teacher View
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <StatCard label="Created Decks" value={loading ? '...' : stats.createdDecks} />
                    <StatCard label="Created Subjects" value={loading ? '...' : stats.createdSubjects} />
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
