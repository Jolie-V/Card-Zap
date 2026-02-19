
import React, { useState, useEffect } from 'react';
// FIX: Replaced non-existent UsersIcon with UserGroupIcon.
import { UserGroupIcon, AcademicCapIcon, BookOpenIcon, RefreshIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    value: number | string;
    color: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex items-center gap-6 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1' : ''}`}
        >
            <div className={`w-16 h-16 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-8 w-8 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-primary-500 dark:text-gray-400">{title}</p>
                <p className="text-4xl font-bold text-primary-700 dark:text-gray-200">{value}</p>
            </div>
        </div>
    );
};

interface ActivityData {
    activity_date: string;
    new_users: number;
    study_sessions: number;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0, subjects: 0 });
    const [chartData, setChartData] = useState<ActivityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const navigate = useNavigate();

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const fetchStats = async () => {
            if (isMounted) {
                setLoading(true);
                setError(null);
            }
            try {
                // Run both requests in parallel
                const statsPromise = supabase.rpc('get_admin_stats').abortSignal(controller.signal);
                const chartPromise = supabase.rpc('get_admin_activity_trends').abortSignal(controller.signal);

                const [statsResult, chartResult] = await Promise.all([statsPromise, chartPromise]);
                
                if (!isMounted) return;

                if (statsResult.error) throw statsResult.error;
                if (chartResult.error) throw chartResult.error;
                
                if (statsResult.data && statsResult.data.length > 0) {
                     const result = statsResult.data[0];
                     setStats({
                        total: result.total_users,
                        students: result.student_users,
                        teachers: result.teacher_users,
                        subjects: result.total_subjects || 0,
                     });
                } else {
                    setStats({ total: 0, students: 0, teachers: 0, subjects: 0 });
                }

                if (chartResult.data) {
                    setChartData(chartResult.data as ActivityData[]);
                }

            } catch (err: unknown) {
                if (!isMounted) return;
                
                if (err instanceof Error && err.name === 'AbortError') {
                    console.error('Admin stats fetch timed out.');
                    setError('Failed to load statistics: The request timed out. Please check your connection.');
                } else {
                    const errMsg = getErrorMessage(err);
                    console.error("Error fetching admin stats via RPC:", errMsg);
                    setError(errMsg);
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
    }, [refreshTrigger]);

    const statCards = [
        {
            title: "Total Users",
            value: loading ? '...' : stats.total,
            icon: UserGroupIcon,
            color: 'bg-primary-500',
            // Removed onClick for Total Users
        },
        {
            title: "Students",
            value: loading ? '...' : stats.students,
            icon: UserGroupIcon,
            color: 'bg-primary-400',
            onClick: () => navigate('/admin/students')
        },
        {
            title: "Teachers",
            value: loading ? '...' : stats.teachers,
            icon: AcademicCapIcon,
            color: 'bg-primary-600',
            onClick: () => navigate('/admin/teachers')
        },
        {
            title: "Total Subjects",
            value: loading ? '...' : stats.subjects,
            icon: BookOpenIcon,
            color: 'bg-primary-700',
            onClick: () => navigate('/admin/subjects')
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
                    <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">
                        Admin Dashboard
                    </h1>
                    <p className="text-primary-500 dark:text-gray-400 mt-1">
                        An overview of the application's activity and users.
                    </p>
                </div>
                <button 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex mt-4 sm:mt-0 items-center justify-center gap-2 font-semibold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-4 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                    <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                    <strong className="font-bold">Dashboard Error: </strong>
                    <span className="block sm:inline whitespace-pre-wrap">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => (
                    <StatCard 
                        key={index}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        color={stat.color}
                        onClick={stat.onClick}
                    />
                ))}
            </div>

            {/* Activity Chart Section */}
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700 mb-8">
                <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-200 mb-6">Platform Activity Trends (Last 7 Days)</h2>
                <div className="h-80 w-full">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-gray-300"></div>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            No activity data available yet.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart
                                data={chartData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'} />
                                <XAxis 
                                    dataKey="activity_date" 
                                    stroke={document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#4B5563'}
                                />
                                <YAxis 
                                    stroke={document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#4B5563'}
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                                        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb',
                                        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Area 
                                    type="monotone" 
                                    dataKey="new_users" 
                                    name="New Users"
                                    stroke="#10B981" 
                                    fillOpacity={1} 
                                    fill="url(#colorUsers)" 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="study_sessions" 
                                    name="Study Sessions"
                                    stroke="#6366F1" 
                                    fillOpacity={1} 
                                    fill="url(#colorSessions)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
