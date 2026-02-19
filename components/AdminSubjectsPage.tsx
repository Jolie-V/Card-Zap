
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { AdminSubjectView } from '../types';
import { SearchIcon, RefreshIcon, BookOpenIcon, TrashIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

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


const AdminSubjectsPage: React.FC = () => {
    const [subjects, setSubjects] = useState<AdminSubjectView[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [subjectToDelete, setSubjectToDelete] = useState<AdminSubjectView | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        let isMounted = true;
        const fetchSubjects = async () => {
            if (!isMounted) return;
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: rpcError } = await supabase.rpc('admin_search_subjects', {
                    search_term: debouncedSearchTerm.trim() || null
                });

                if (!isMounted) return;
                if (rpcError) throw rpcError;
                
                setSubjects(data as AdminSubjectView[] || []);

            } catch (err) {
                if (isMounted) {
                    setError(`Failed to load subjects: ${getErrorMessage(err)}`);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSubjects();

        return () => { isMounted = false; };
    }, [debouncedSearchTerm, refreshTrigger]);

    const handleDelete = async () => {
        if (!subjectToDelete) return;
        setIsDeleting(true);
        if(error && !error.startsWith('Failed to delete subject:')) {
            // keep the main page error
        } else {
             setError(null);
        }
        
        try {
            const { error: rpcError } = await supabase.rpc('admin_delete_subject', {
                subject_id_to_delete: subjectToDelete.id
            });
            if (rpcError) throw rpcError;

            setSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
            setSubjectToDelete(null); // Close modal on success

        } catch (err) {
            setError(`Failed to delete subject: ${getErrorMessage(err)}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
      <>
        {subjectToDelete && (
            <ConfirmationModal
                title="Delete Subject"
                message={`Are you sure you want to permanently delete "${subjectToDelete.title}"? This will remove all decks and student enrollments associated with it. This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => { setSubjectToDelete(null); setError(null); }}
                confirmText="Delete Subject"
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
                    <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">Manage Subjects</h1>
                    <p className="text-primary-500 dark:text-gray-400 mt-1">View and manage all subjects across the platform.</p>
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
                    placeholder="Search by title, code, or teacher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-primary-300 dark:border-gray-600 rounded-md pl-10 pr-4 py-3 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 dark:text-gray-500" />
            </div>

            {/* Error Display */}
            {error && !subjectToDelete && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>
            )}

            {/* Content Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-primary-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-primary-200 dark:divide-gray-700">
                        <thead className="bg-primary-100/50 dark:bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Teacher</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-primary-200 dark:divide-gray-700">
                           {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-8 h-8 rounded bg-primary-200 dark:bg-gray-700 animate-pulse"></div><div className="ml-4"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div></div></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-8 mx-auto animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-primary-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-primary-200 dark:bg-gray-700 rounded-full animate-pulse"></div></div></td>
                                    </tr>
                                ))
                            ) : subjects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-primary-500 dark:text-gray-400">
                                        {searchTerm ? `No subjects found for "${searchTerm}"` : "No subjects found."}
                                    </td>
                                </tr>
                            ) : (
                                subjects.map(subject => (
                                    <tr key={subject.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 bg-primary-100 dark:bg-gray-700 rounded flex items-center justify-center text-primary-500 dark:text-gray-400">
                                                    <BookOpenIcon className="w-5 h-5" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-primary-800 dark:text-gray-100">{subject.title}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600 dark:text-gray-300">{subject.subject_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-gray-300">{subject.teacher_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-primary-600 dark:text-gray-300">{subject.student_count}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 dark:text-gray-300">{new Date(subject.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end items-center gap-2">
                                                <button onClick={() => { setSubjectToDelete(subject); setError(null); }} className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Delete Subject">
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

export default AdminSubjectsPage;