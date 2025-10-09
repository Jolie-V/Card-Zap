
import React, { useState, useEffect, useCallback } from 'react';
import { UsersIcon, UserGroupIcon, AcademicCapIcon, BookOpenIcon, RefreshIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: number | string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex items-center gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}>
            <div className={`w-16 h-16 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-8 w-8 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-primary-500">{title}</p>
                <p className="text-4xl font-bold text-primary-700">{value}</p>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0, subjects: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_admin_stats').abortSignal(controller.signal);
            if (rpcError) throw rpcError;
            
            if (data && data.length > 0) {
                 const result = data[0];
                 setStats({
                    total: result.total_users,
                    students: result.student_users,
                    teachers: result.teacher_users,
                    subjects: result.total_subjects || 0,
                 });
            } else {
                setStats({ total: 0, students: 0, teachers: 0, subjects: 0 });
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.error('Admin stats fetch timed out.');
                setError('Failed to load statistics: The request timed out. Please check your connection.');
            } else {
                console.error("Error fetching admin stats via RPC:", getErrorMessage(err));
                setError(`Failed to fetch statistics. (Details: ${getErrorMessage(err)})`);
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const statCards = [
        {
            title: "Total Users",
            value: loading ? '...' : stats.total,
            icon: UsersIcon,
            color: 'bg-primary-500'
        },
        {
            title: "Students",
            value: loading ? '...' : stats.students,
            icon: UserGroupIcon,
            color: 'bg-blue-500'
        },
        {
            title: "Teachers",
            value: loading ? '...' : stats.teachers,
            icon: AcademicCapIcon,
            color: 'bg-green-500'
        },
        {
            title: "Total Subjects",
            value: loading ? '...' : stats.subjects,
            icon: BookOpenIcon,
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-primary-700">
                        Admin Dashboard
                    </h1>
                    <p className="text-primary-500 mt-1">
                        An overview of the application's activity and users.
                    </p>
                </div>
                <button 
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex mt-4 sm:mt-0 items-center justify-center gap-2 font-semibold bg-primary-200 text-primary-600 rounded-lg py-2 px-4 transition-all hover:bg-primary-300/80 disabled:opacity-50"
                >
                    <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                    <strong className="font-bold">Dashboard Error: </strong>
                    <span className="block sm:inline whitespace-pre-wrap">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <StatCard 
                        key={index}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        color={stat.color}
                    />
                ))}
            </div>

            <div className="mt-8 bg-white p-8 rounded-2xl shadow-xl w-full border border-primary-200">
                <h2 className="text-2xl font-bold text-primary-600 mb-4">Management</h2>
                <div className="text-center p-12 bg-primary-100 rounded-lg">
                    <p className="text-primary-600">User management and content moderation features are coming soon.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
