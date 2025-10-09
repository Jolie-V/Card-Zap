
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { ProfileAvatar } from './icons';
import { getErrorMessage } from '../utils';

interface ProfilePageProps {
    user: User;
}

interface StatCardProps {
    label: string;
    value: number | string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 w-full text-center">
        <p className="text-4xl font-bold text-blue-500">{value}</p>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mt-2">{label}</p>
    </div>
);

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
    const [stats, setStats] = useState({ createdDecks: 0, finishedDecks: 0, createdSubjects: 0, scoreAverage: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchStats = async () => {
            setLoading(true);
            setError(null);

            try {
                const decksPromise = supabase
                    .from('decks')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .abortSignal(controller.signal);
                
                const sessionsPromise = supabase
                    .from('study_sessions')
                    .select('deck_id, score_percentage')
                    .eq('user_id', user.id)
                    .abortSignal(controller.signal);
                
                const promises: Promise<any>[] = [decksPromise, sessionsPromise];
                if (user.role === UserRole.TEACHER) {
                    promises.push(supabase
                        .from('subjects')
                        .select('*', { count: 'exact', head: true })
                        .eq('teacher_id', user.id)
                        .abortSignal(controller.signal));
                }

                const [decksResult, sessionsResult, subjectsResult] = await Promise.all(promises);

                if (decksResult.error) throw decksResult.error;
                if (sessionsResult.error) throw sessionsResult.error;
                if (subjectsResult && subjectsResult.error) {
                    throw subjectsResult.error;
                }

                const createdDecks = decksResult.count || 0;
                const sessionsData = sessionsResult.data || [];
                const finishedDecks = new Set(sessionsData.map(s => s.deck_id)).size;
                const scoreAverage = sessionsData.length > 0
                    ? Math.round(sessionsData.reduce((acc, s) => acc + s.score_percentage, 0) / sessionsData.length)
                    : 0;
                const createdSubjects = (subjectsResult && subjectsResult.count) || 0;

                setStats({
                    createdDecks,
                    finishedDecks,
                    createdSubjects,
                    scoreAverage,
                });

            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    console.error('Profile stats fetch timed out.');
                    setError('Failed to load profile stats: The request timed out. Please check your connection.');
                } else {
                    console.error('Error fetching profile stats:', getErrorMessage(err));
                    setError(`Failed to load your profile statistics. (Details: ${getErrorMessage(err)})`);
                }
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        fetchStats();
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [user]);

    return (
        <div className="max-w-4xl mx-auto w-full animate-[fade-in-up_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-8" role="alert">
                    <strong className="font-bold">Profile Error: </strong>
                    <span className="block sm:inline whitespace-pre-wrap">{error}</span>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full border border-primary-200 flex items-center gap-6 mb-8">
                <ProfileAvatar />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{user.full_name}</h2>
                    {user.role === UserRole.STUDENT ? (
                         <p className="text-gray-600 font-semibold">{user.course || 'Student'}</p>
                    ) : (
                         <p className="text-blue-500 font-semibold">{user.role}</p>
                    )}
                    <p className="text-gray-500">{user.email}</p>
                </div>
            </div>

            {user.role === UserRole.STUDENT ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <StatCard label="Created Decks" value={loading ? '...' : stats.createdDecks} />
                        <StatCard label="Finished Decks" value={loading ? '...' : stats.finishedDecks} />
                        <StatCard label="Score Average" value={loading ? '...' : `${stats.scoreAverage}%`} />
                    </div>
                    <div className="mt-8 bg-white p-6 rounded-2xl shadow-xl w-full border border-primary-200">
                        <h3 className="text-xl font-bold text-gray-700 mb-4">Progress</h3>
                        <div className="h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <p className="text-gray-400">Your progress chart will appear here.</p>
                        </div>
                    </div>
                </>
            ) : ( // Teacher View
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatCard label="Created Decks" value={loading ? '...' : stats.createdDecks} />
                    <StatCard label="Finished Decks" value={loading ? '...' : stats.finishedDecks} />
                    <StatCard label="Created Subjects" value={loading ? '...' : stats.createdSubjects} />
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
