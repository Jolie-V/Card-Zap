
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircleIcon, BookOpenIcon, EllipsisVerticalIcon, TrashIcon, RefreshIcon } from './icons';
import { Subject, EnrolledSubject, EnrollmentStatus } from '../types';
import EnrollSubjectModal from './EnrollSubjectModal';
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

const YourSubjectsPage: React.FC = () => {
    const { user, ensureProfile } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enrollError, setEnrollError] = useState<string | null>(null);
    const [menuOpenForSubject, setMenuOpenForSubject] = useState<string | null>(null);
    const [showUnenrollModal, setShowUnenrollModal] = useState<EnrolledSubject | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
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
                const { data, error } = await supabase
                    .from('subject_enrollments')
                    .select('status, subjects(*)')
                    .eq('student_id', user.id)
                    .abortSignal(controller.signal);
                
                if (!isMounted) return;
                if (error) throw error;

                // FIX: Use unknown cast to handle type mismatch with Supabase return type
                const enrolledSubjects = (data
                    .map(item => {
                        if (!item.subjects) return null;
                        return {
                            ...item.subjects,
                            enrollment_status: item.status as EnrollmentStatus,
                        };
                    })
                    .filter(Boolean) || []) as unknown as EnrolledSubject[];
                
                if (isMounted) {
                    setSubjects(enrolledSubjects);
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

    const handleEnroll = async (subjectCode: string) => {
        setIsSubmitting(true);
        setEnrollError(null);
        try {
            // Critical fix: Ensure profile exists before enrolling to prevent FK error
            await ensureProfile();

            const { data, error: rpcError } = await supabase.rpc('enroll_in_subject', {
                subject_code_to_enroll: subjectCode
            });

            if (rpcError) throw rpcError;
            
            if (data && !data.success) {
                throw new Error(data.message);
            }

            alert(data.message);
            handleRefresh(); // Refetch after creation
            setIsEnrollModalOpen(false);

        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            console.error("Failed to enroll in subject:", errorMessage);
            setEnrollError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUnenroll = async () => {
        if (!showUnenrollModal) return;

        setIsSubmitting(true);
        setEnrollError(null);
        try {
             const { error } = await supabase.rpc('unenroll_from_subject', {
                subject_id_to_unenroll: parseInt(showUnenrollModal.id, 10)
            });

            if (error) throw error;
            
            setSubjects(prev => prev.filter(s => s.id !== showUnenrollModal.id));
            setShowUnenrollModal(null);
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            console.error("Failed to unenroll:", errorMessage);
            setEnrollError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleMenuClick = (subjectId: string) => {
        setMenuOpenForSubject(prev => (prev === subjectId ? null : subjectId));
    };
    
    const openUnenrollModal = (subject: EnrolledSubject) => {
        setMenuOpenForSubject(null);
        setEnrollError(null); // Clear previous errors
        setShowUnenrollModal(subject);
    };
    
    if (!user) return null;

    return (
        <>
            {isEnrollModalOpen && (
                <EnrollSubjectModal
                    onClose={() => setIsEnrollModalOpen(false)}
                    onEnroll={handleEnroll}
                    isSubmitting={isSubmitting}
                    error={enrollError}
                />
            )}
            {showUnenrollModal && (
                <ConfirmationModal
                    title={showUnenrollModal.enrollment_status === EnrollmentStatus.PENDING ? "Cancel Request" : "Un-enroll from Subject"}
                    message={
                        showUnenrollModal.enrollment_status === EnrollmentStatus.PENDING
                        ? `Are you sure you want to cancel your enrollment request for "${showUnenrollModal.title}"?`
                        : `Are you sure you want to un-enroll from "${showUnenrollModal.title}"? You will lose access to its study decks.`
                    }
                    onConfirm={handleUnenroll}
                    onCancel={() => setShowUnenrollModal(null)}
                    confirmText={showUnenrollModal.enrollment_status === EnrollmentStatus.PENDING ? "Cancel Request" : "Un-enroll"}
                    isConfirming={isSubmitting}
                    error={enrollError}
                />
            )}
            <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
                <style>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-primary-700 dark:text-gray-100">
                            Your Subjects
                        </h1>
                        <p className="text-primary-500 dark:text-gray-400 mt-1">View the subjects you are currently enrolled in.</p>
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
                                setEnrollError(null);
                                setIsEnrollModalOpen(true);
                            }}
                            disabled={isLoading}
                            className="flex-grow flex items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50"
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                            Enroll in Subject
                        </button>
                    </div>
                </div>
                
                {pageError && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{pageError}</div>
                )}
                
                {isLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <SubjectSkeleton key={i} />)}
                    </div>
                ) : subjects.length === 0 && !pageError ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-200">You are not enrolled in any subjects.</h2>
                        <p className="text-primary-500 dark:text-gray-400 mt-2">Click "Enroll in Subject" and enter a code from your teacher.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => (
                            <div key={subject.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative">
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => handleMenuClick(subject.id)}
                                        className="p-1 rounded-full text-primary-400 dark:text-gray-500 hover:bg-primary-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-gray-300"
                                        aria-label="Subject options"
                                    >
                                        <EllipsisVerticalIcon className="w-6 h-6" />
                                    </button>
                                    {menuOpenForSubject === subject.id && (
                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-primary-200 dark:border-gray-600">
                                            <button
                                                onClick={() => openUnenrollModal(subject)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                            >
                                               <TrashIcon className="w-4 h-4" /> 
                                               {subject.enrollment_status === EnrollmentStatus.PENDING ? 'Cancel Request' : 'Un-enroll'}
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
                                    {subject.enrollment_status === EnrollmentStatus.PENDING && (
                                        <span className="text-xs font-bold bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full mt-2 inline-block">
                                            Pending Approval
                                        </span>
                                    )}
                                    <p className="text-sm text-primary-500 dark:text-gray-400 mt-1 h-10 overflow-hidden">{subject.description || "No description."}</p>
                                </div>
                                <button 
                                    onClick={() => navigate(`/your-subjects/${subject.id}`)}
                                    disabled={subject.enrollment_status === EnrollmentStatus.PENDING}
                                    className="mt-6 w-full font-semibold bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-md py-2 px-4 transition-colors hover:bg-primary-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary-100 dark:disabled:bg-gray-700"
                                >
                                    View Decks
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default YourSubjectsPage;