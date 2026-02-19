
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { AdminTeacherView } from '../types';
import { SearchIcon, RefreshIcon, UserIcon, TrashIcon, EyeIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';
const ViewTeacherProfileModal = lazy(() => import('./ViewTeacherProfileModal'));

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


const TeachersPage: React.FC = () => {
    const [teachers, setTeachers] = useState<AdminTeacherView[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [teacherToView, setTeacherToView] = useState<AdminTeacherView | null>(null);
    const [teacherToDelete, setTeacherToDelete] = useState<AdminTeacherView | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        let isMounted = true;
        const fetchTeachers = async () => {
            if (!isMounted) return;
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: rpcError } = await supabase.rpc('admin_search_teachers', {
                    search_term: debouncedSearchTerm.trim() || null
                });

                if (!isMounted) return;
                if (rpcError) throw rpcError;
                
                setTeachers(data as AdminTeacherView[] || []);

            } catch (err) {
                if (isMounted) {
                    setError(`Failed to load teachers: ${getErrorMessage(err)}`);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchTeachers();

        return () => { isMounted = false; };
    }, [debouncedSearchTerm, refreshTrigger]);

    const handleDelete = async () => {
        if (!teacherToDelete) return;
        setIsDeleting(true);
        if(error && !error.startsWith('Failed to delete teacher:')) {
            // keep the main page error
        } else {
             setError(null);
        }
        
        try {
            const { error: rpcError } = await supabase.rpc('admin_delete_user', {
                user_id_to_delete: teacherToDelete.id
            });
            if (rpcError) throw rpcError;

            setTeachers(prev => prev.filter(s => s.id !== teacherToDelete.id));
            setTeacherToDelete(null); // Close modal on success

        } catch (err) {
            setError(`Failed to delete teacher: ${getErrorMessage(err)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
      <>
        <Suspense fallback={<div/>}>
            {teacherToView && (
                <ViewTeacherProfileModal teacher={teacherToView} onClose={() => setTeacherToView(null)} />
            )}
        </Suspense>
        {teacherToDelete && (
            <ConfirmationModal
                title="Delete Teacher"
                message={`Are you sure you want to permanently delete the user "${teacherToDelete.full_name}" (${teacherToDelete.email})? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => { setTeacherToDelete(null); setError(null); }}
                confirmText="Delete Teacher"
                isConfirming={isDeleting}
                error={error}
            />
        )}
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">Manage Teachers</h1>
                    <p className="text-primary-500 dark:text-gray-400 mt-1">View, search, and manage teacher accounts.</p>
                </div>
                <button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2 font-semibold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-4 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input 
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-primary-300 dark:border-gray-600 rounded-md pl-10 pr-4 py-3 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 dark:text-gray-500" />
            </div>

            {/* Error Display */}
            {error && !teacherToDelete && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>
            )}

            {/* Content Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-primary-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-primary-200 dark:divide-gray-700">
                        <thead className="bg-primary-100/50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Subjects</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Date Joined</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-primary-200 dark:divide-gray-700">
                           {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-10 h-10 rounded-full bg-primary-200 dark:bg-gray-700 animate-pulse"></div><div className="ml-4"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div><div className="h-3 bg-primary-200 dark:bg-gray-700 rounded w-24 mt-2 animate-pulse"></div></div></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-12 mx-auto animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-28 animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-primary-200 dark:bg-gray-700 rounded-full animate-pulse"></div><div className="h-8 w-8 bg-primary-200 dark:bg-gray-700 rounded-full animate-pulse"></div></div></td>
                                    </tr>
                                ))
                            ) : teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-primary-500 dark:text-gray-400">
                                        {searchTerm ? `No teachers found for "${searchTerm}"` : "No teachers found."}
                                    </td>
                                </tr>
                            ) : (
                                teachers.map(teacher => (
                                    <tr key={teacher.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    {teacher.avatar_url ? (
                                                        <img className="h-10 w-10 rounded-full object-cover" src={teacher.avatar_url} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                                            {teacher.full_name ? teacher.full_name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-primary-800 dark:text-gray-100">{teacher.full_name}</div>
                                                    <div className="text-sm text-primary-500 dark:text-gray-400">{teacher.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-primary-600 dark:text-gray-300">{teacher.subject_count}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-gray-300">{new Date(teacher.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center gap-2">
                                                <button onClick={() => setTeacherToView(teacher)} className="p-2 text-primary-500 hover:text-primary-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors" title="View Profile">
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => { setTeacherToDelete(teacher); setError(null); }} className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Delete Teacher">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </>
    );
};

export default TeachersPage;