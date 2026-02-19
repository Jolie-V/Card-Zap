
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircleIcon, BookOpenIcon, RefreshIcon, EllipsisVerticalIcon, TrashIcon, CogIcon } from './icons';
import { Subject, UserRole } from '../types';
import CreateSubjectModal from './CreateSubjectModal';
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { useAuth } from './AuthProvider';

const SubjectSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 animate-pulse">
        <div className="w-full h-32 rounded-lg bg-primary-200 dark:bg-gray-700 mb-4"></div>
        <div className="h-6 bg-primary-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-10 bg-primary-200 dark:bg-gray-700 rounded w-full mb-6"></div>
        <div className="h-10 bg-primary-100 dark:bg-gray-600 rounded-md w-full"></div>
    </div>
);

const SubjectsPage: React.FC = () => {
    const { user, ensureProfile } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [menuOpenForSubject, setMenuOpenForSubject] = useState<string | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const loadSubjects = async () => {
            if (isMounted) {
                setIsLoading(true);
                setPageError(null);
            }
            try {
                const { data, error: fetchError } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('teacher_id', user.id)
                    .order('created_at', { ascending: false })
                    .abortSignal(controller.signal);
            
                if (!isMounted) return;
                if (fetchError) throw fetchError;
                
                if (isMounted) {
                    setSubjects(data || []);
                }
            } catch (err: unknown) {
                if (!isMounted) return;
                const errorMessage = getErrorMessage(err);
                console.error('Error fetching subjects:', errorMessage);
                if (err instanceof Error && err.name === 'AbortError') {
                    setPageError('Failed to load subjects: The request timed out. Please check your connection.');
                } else {
                    setPageError(`Failed to load your subjects. (Details: ${errorMessage})`);
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSubjects();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [user, refreshTrigger]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenForSubject(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const generateSubjectCode = () => {
        // Exclude 0, O, 1, I to avoid confusion
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreateSubject = async (subjectData: { name: string; description?: string; image_url?: string }) => {
        if (!user || !user.id) {
            setCreateError("You must be logged in to create a subject.");
            return;
        }
        
        // Strict Role Check: Ensure client-side validation matches server-side policy
        if (user.role !== UserRole.TEACHER) {
            setCreateError("Only users with the Teacher role can create subjects.");
            return;
        }

        setIsSubmitting(true);
        setCreateError(null);
        try {
            // Critical fix: Ensure profile exists before creating subject to prevent FK/Recursion error
            await ensureProfile();

            // Fix: Explicitly generate a subject code client-side to prevent database null errors
            const subjectCode = generateSubjectCode();
            
            console.log("Creating subject with payload:", {
                title: subjectData.name,
                teacher_id: user.id,
                subject_code: subjectCode
            });

            const { data, error: insertError } = await supabase.from('subjects').insert({
                title: subjectData.name,
                description: subjectData.description,
                image_url: subjectData.image_url,
                teacher_id: user.id,
                subject_code: subjectCode
            }).select().single();

            if (insertError) {
                console.error("Supabase insert error details:", JSON.stringify(insertError, null, 2));
                throw insertError;
            }

            handleRefresh(); // Refetch after creation
            setIsCreateModalOpen(false);

        } catch (err: any) {
            console.error("Failed to create subject:", JSON.stringify(err, null, 2));
            let message = getErrorMessage(err);
            
            // Append raw details for debugging
            if (err?.details) message += `\nDetails: ${err.details}`;
            if (err?.hint) message += `\nHint: ${err.hint}`;
            
            setCreateError(message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleMenuClick = (subjectId: string) => {
        setMenuOpenForSubject(prev => (prev === subjectId ? null : subjectId));
    };

    const handleConfirmDelete = async () => {
        if (!subjectToDelete) return;

        setIsDeleting(true);
        setPageError(null);

        try {
            const { error } = await supabase.rpc('delete_subject', {
                subject_id_to_delete: parseInt(subjectToDelete.id, 10)
            });

            if (error) throw error;

            setSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
            setSubjectToDelete(null);
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setPageError(`Failed to delete subject: ${errorMessage}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const goToSettings = () => {
        setIsCreateModalOpen(false);
        navigate('/settings');
    };

    if (!user) return null;

    return (
        <>
            {isCreateModalOpen && (
                <CreateSubjectModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateSubject}
                    isSubmitting={isSubmitting}
                    error={createError}
                    onFixClick={goToSettings}
                />
            )}
            {subjectToDelete && (
                 <ConfirmationModal
                    title="Delete Subject"
                    message={`Are you sure you want to permanently delete "${subjectToDelete.title}"? This will un-enroll all students and remove all assigned decks. This action cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => { setSubjectToDelete(null); setPageError(null); }}
                    confirmText="Delete Subject"
                    isConfirming={isDeleting}
                    error={pageError}
                />
            )}
            <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
                <style>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes fade-in {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">
                            Your Subjects
                        </h1>
                        <p className="text-primary-500 dark:text-gray-400 mt-1">Manage your courses and assign study decks to students.</p>
                    </div>
                     <div className="flex w-full sm:w-auto items-center gap-2">
                        <button 
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-3 text-primary-600 dark:text-gray-300 bg-primary-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50"
                            aria-label="Refresh subjects"
                        >
                            <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={() => {
                                setCreateError(null);
                                setIsCreateModalOpen(true);
                            }}
                            disabled={isLoading}
                            className="flex-grow flex items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50"
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                            Create New Subject
                        </button>
                    </div>
                </div>
                
                {pageError && !subjectToDelete && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{pageError}</div>
                )}
                
                {isLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <SubjectSkeleton key={i} />)}
                    </div>
                ) : subjects.length === 0 && !pageError ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-200">No subjects yet!</h2>
                        <p className="text-primary-500 dark:text-gray-400 mt-2">Click "Create New Subject" to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => (
                            <div key={subject.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group">
                                <div className="absolute top-2 right-2">
                                    <button
                                        onClick={() => handleMenuClick(subject.id)}
                                        className="p-2 rounded-full text-primary-400 dark:text-gray-500 hover:bg-primary-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                        aria-label="Subject options"
                                    >
                                        <EllipsisVerticalIcon className="w-6 h-6" />
                                    </button>
                                    {menuOpenForSubject === subject.id && (
                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-primary-200 dark:border-gray-600 animate-[fade-in_0.1s_ease-out]">
                                            <button
                                                onClick={() => {
                                                    setPageError(null);
                                                    setSubjectToDelete(subject);
                                                    setMenuOpenForSubject(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                            >
                                               <TrashIcon className="w-4 h-4" /> 
                                               Delete Subject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {subject.image_url ? (
                                        <img src={subject.image_url} alt={subject.title} className="w-full h-32 object-cover rounded-lg mb-4 bg-primary-100 dark:bg-gray-700" />
                                    ) : (
                                        <div className="w-full h-32 rounded-lg bg-primary-200 dark:bg-gray-700 mb-4 flex items-center justify-center">
                                            <BookOpenIcon className="w-12 h-12 text-white/50 dark:text-gray-800/50" />
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-primary-700 dark:text-gray-200 truncate pr-8">{subject.title}</h2>
                                    <p className="text-sm text-primary-500 dark:text-gray-400 mt-1 h-10 overflow-hidden">{subject.description || "No description."}</p>
                                    <p className="text-xs font-mono text-primary-400 dark:text-gray-500 mt-2">Code: {subject.subject_code}</p>
                                </div>
                                <button 
                                    onClick={() => navigate(`/subjects/${subject.id}`)}
                                    className="mt-6 w-full font-semibold bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-md py-2 px-4 transition-colors hover:bg-primary-200 dark:hover:bg-gray-600">
                                    Manage Subject
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default SubjectsPage;
