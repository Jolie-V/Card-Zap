import React, { useState, useEffect } from 'react';
import { UsersIcon, UserGroupIcon, AcademicCapIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';

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
    const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { count: totalCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });
                
                const { count: studentCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', UserRole.STUDENT);

                const { count: teacherCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', UserRole.TEACHER);
                
                setStats({
                    total: totalCount ?? 0,
                    students: studentCount ?? 0,
                    teachers: teacherCount ?? 0
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary-700">
                    Admin Dashboard
                </h1>
                <p className="text-primary-500 mt-1">
                    An overview of the application's activity and users.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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