
import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircleIcon, BookOpenIcon, RefreshIcon } from './icons';
import { Subject, User } from '../types';
import CreateSubjectModal from './CreateSubjectModal';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';

interface SubjectsPageProps {
    user: User;
    onNavigateToSubjectRoom: (subject: Subject) => void;
}

const SubjectSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 animate-pulse">
        <div className="w-full h-32 rounded-lg bg-primary-200 mb-4"></div>
        <div className="h-6 bg-primary-200 rounded w-3/4 mb-2"></div>
        <div className="h-10 bg-primary-200 rounded w-full mb-6"></div>
        <div className="h-10 bg-primary-100 rounded-md w-full"></div>
    </div>
);

const SubjectsPage: React.FC<SubjectsPageProps> = ({ user, onNavigateToSubjectRoom }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const loadSubjects = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        setIsLoading(true);
        setPageError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('subjects')
                .select('*')
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);
        
            if (fetchError) throw fetchError;
            setSubjects(data || []);
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            console.error('Error fetching subjects:', errorMessage);
            if (err instanceof Error && err.name === 'AbortError') {
                setPageError('Failed to load subjects: The request timed out. Please check your connection.');
            } else {
                setPageError(`Failed to load your subjects. (Details: ${errorMessage})`);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        loadSubjects();
    }, [loadSubjects]);

    const handleCreateSubject = async (subjectData: { name: string; description?: string; image_url?: string }) => {
        setIsSubmitting(true);
        setCreateError(null);
        try {
            const { error: insertError } = await supabase.from('subjects').insert({
                title: subjectData.name,
                description: subjectData.description,
                image_url: subjectData.image_url,
                teacher_id: user.id,
            });

            if (insertError) {
                throw insertError;
            }

            await loadSubjects(); // Refetch after creation
            setIsCreateModalOpen(false);

        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            console.error("Failed to create subject:", errorMessage);
            if (errorMessage.includes("schema cache")) {
                setCreateError("SCHEMA_CACHE_ERROR:Failed to create subject due to a database sync issue. A page refresh is required to sync with the latest database changes.");
            } else {
                setCreateError(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {isCreateModalOpen && (
                <CreateSubjectModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateSubject}
                    isSubmitting={isSubmitting}
                    error={createError}
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
                        <h1 className="text-4xl font-bold text-primary-700">
                            Your Subjects
                        </h1>
                        <p className="text-primary-500 mt-1">Manage your courses and assign study decks to students.</p>
                    </div>
                     <div className="flex w-full sm:w-auto items-center gap-2">
                        <button 
                            onClick={loadSubjects}
                            disabled={isLoading}
                            className="p-3 text-primary-600 bg-primary-200 rounded-lg transition-colors hover:bg-primary-300/80 disabled:opacity-50"
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
                
                {pageError && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{pageError}</div>}
                
                {isLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <SubjectSkeleton key={i} />)}
                    </div>
                ) : subjects.length === 0 && !pageError ? (
                    <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-primary-200">
                        <h2 className="text-2xl font-bold text-primary-600">No subjects yet!</h2>
                        <p className="text-primary-500 mt-2">Click "Create New Subject" to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => (
                            <div key={subject.id} className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                                <div>
                                    {subject.image_url ? (
                                        <img src={subject.image_url} alt={subject.title} className="w-full h-32 object-cover rounded-lg mb-4 bg-primary-100" />
                                    ) : (
                                        <div className="w-full h-32 rounded-lg bg-primary-200 mb-4 flex items-center justify-center">
                                            <BookOpenIcon className="w-12 h-12 text-white/50" />
                                        </div>
                                    )}
                                    <h2 className="text-xl font-bold text-primary-700 truncate">{subject.title}</h2>
                                    <p className="text-sm text-primary-500 mt-1 h-10 overflow-hidden">{subject.description || "No description."}</p>
                                </div>
                                <button 
                                    onClick={() => onNavigateToSubjectRoom(subject)}
                                    className="mt-6 w-full font-semibold bg-primary-100 text-primary-600 rounded-md py-2 px-4 transition-colors hover:bg-primary-200">
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