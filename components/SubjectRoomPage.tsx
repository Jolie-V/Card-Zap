
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Subject, Deck, User, SubjectEnrollment, EnrollmentStatus } from '../types';
import { CardsIcon, UserGroupIcon, InformationCircleIcon, PlusCircleIcon, TrashIcon, ProfileAvatar, RefreshIcon, ChartBarIcon, EllipsisVerticalIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { CARD_COLORS } from '../constants';
import AddDeckToSubjectModal from './AddDeckToSubjectModal';
import ConfirmationModal from './ConfirmationModal';
import EditSubjectModal from './EditSubjectModal';
import { useAuth } from './AuthProvider';
import LoadingView from './LoadingView';
const AnalyticsTab = lazy(() => import('./AnalyticsTab'));

// FIX: Define the Tab type for the active tab state.
type Tab = 'cards' | 'members' | 'analytics' | 'info';

const SubjectRoomPage: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<Tab>('cards');
    const [pendingRequestCount, setPendingRequestCount] = useState(0);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

     useEffect(() => {
        const fetchSubject = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (!subjectId) throw new Error("Subject ID is missing from URL.");
                const { data, error } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('id', parseInt(subjectId))
                    .single();
                if (error) throw error;
                setSubject(data);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubject();
    }, [subjectId]);

    const handleSubjectUpdate = async (updatedData: { title: string; description?: string; image_url?: string; }) => {
        if (!subject) return;
        setIsUpdating(true);
        setUpdateError(null);
        try {
            const { data, error } = await supabase
                .from('subjects')
                .update({
                    title: updatedData.title,
                    description: updatedData.description,
                    image_url: updatedData.image_url,
                })
                .eq('id', subject.id)
                .select()
                .single();

            if (error) throw error;
            
            setSubject(data);
            setIsEditModalOpen(false);
        } catch (err) {
            setUpdateError(getErrorMessage(err));
        } finally {
            setIsUpdating(false);
        }
    };

    const renderTabContent = () => {
        if (!subject) return null;
        switch (activeTab) {
            case 'cards':
                return <CardsTab subject={subject} />;
            case 'members':
                return <MembersTab subject={subject} setPendingRequestCount={setPendingRequestCount} />;
            case 'analytics':
                 return (
                    <Suspense fallback={<div className="text-center p-12">Loading Analytics...</div>}>
                        <AnalyticsTab subject={subject} />
                    </Suspense>
                );
            case 'info':
                return <InfoTab subject={subject} onBack={() => navigate('/subjects')} onEdit={() => setIsEditModalOpen(true)} />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return <LoadingView title="Loading Subject..." />;
    }

    if (error) {
         return <div className="text-center p-8 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;
    }
    
    if (!subject) {
        return <div className="text-center p-8">Subject not found.</div>;
    }
    
    return (
        <>
            {isEditModalOpen && (
                <EditSubjectModal 
                    subject={subject}
                    onClose={() => setIsEditModalOpen(false)}
                    onUpdate={handleSubjectUpdate}
                    isSubmitting={isUpdating}
                    error={updateError}
                />
            )}
            <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
                <style>{`
                    @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                
                <div className="mb-8">
                    <button onClick={() => navigate('/subjects')} className="text-primary-500 dark:text-gray-400 hover:text-primary-700 dark:hover:text-gray-200 font-semibold mb-4">&larr; Back to Subjects</button>
                    <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                        {subject.image_url ? (
                            <img src={subject.image_url} alt={subject.title} className="w-24 h-24 sm:w-20 sm:h-20 rounded-lg object-cover bg-primary-200 dark:bg-gray-700 flex-shrink-0" />
                        ) : (
                            <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-lg bg-primary-200 dark:bg-gray-700 flex-shrink-0"></div>
                        )}
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-gray-100">{subject.title}</h1>
                            <p className="text-primary-500 dark:text-gray-400 mt-1 max-w-xl">{subject.description || "No description provided."}</p>
                        </div>
                    </div>
                </div>

                <div className="border-b border-primary-300 dark:border-gray-600 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        <TabButton icon={CardsIcon} label="Cards" isActive={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
                        <TabButton icon={UserGroupIcon} label="Members" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} notificationCount={pendingRequestCount} />
                        <TabButton icon={ChartBarIcon} label="Analytics" isActive={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
                        <TabButton icon={InformationCircleIcon} label="Info & Settings" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} />
                    </nav>
                </div>
                
                <div>
                    {renderTabContent()}
                </div>
            </div>
        </>
    );
};

interface TabButtonProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
    notificationCount?: number;
}
const TabButton: React.FC<TabButtonProps> = ({ icon: Icon, label, isActive, onClick, notificationCount = 0 }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold transition-colors relative ${
            isActive
                ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                : 'border-transparent text-primary-400 dark:text-gray-400 hover:text-primary-600 dark:hover:text-gray-200 hover:border-primary-400 dark:hover:border-gray-200'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
        {notificationCount > 0 && (
             <span className="absolute top-1 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notificationCount}
            </span>
        )}
    </button>
);


const CardsTab: React.FC<{subject: Subject}> = ({ subject }) => {
    const { user } = useAuth();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [deckToRemove, setDeckToRemove] = useState<Deck | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [menuOpenForDeck, setMenuOpenForDeck] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenForDeck(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchDecks = async () => {
            if(isMounted) {
                setIsLoading(true);
                setError(null);
            }
            try {
                const { data, error } = await supabase
                    .from('subject_decks')
                    .select('decks(*)')
                    .eq('subject_id', subject.id)
                    .abortSignal(controller.signal);

                if (!isMounted) return;
                if (error) throw error;
                // FIX: Use unknown cast to handle potential type mismatch with Supabase return type
                const assignedDecks = (data?.map(item => item.decks).filter(Boolean) || []) as unknown as Deck[];
                if (isMounted) {
                    setDecks(assignedDecks);
                }
            } catch (err) {
                if (!isMounted) return;
                if (err instanceof Error && err.name === 'AbortError') {
                    setError('Failed to load decks: The request timed out.');
                } else {
                    setError(getErrorMessage(err));
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDecks();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [subject.id, refreshTrigger]);

    const handleConfirmRemove = async () => {
        if (!deckToRemove) return;
    
        setIsRemoving(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('subject_decks')
                .delete()
                .match({ subject_id: parseInt(subject.id, 10), deck_id: parseInt(deckToRemove.id, 10) });
            if (deleteError) throw deleteError;
    
            setDecks(prev => prev.filter(d => d.id !== deckToRemove.id));
            setDeckToRemove(null); // Close modal
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsRemoving(false);
        }
    };
    
    if (error && !deckToRemove) {
        return <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">{error}</div>;
    }

    return (
        <>
            {isModalOpen && user && (
                <AddDeckToSubjectModal 
                    subject={subject} 
                    onClose={() => setIsModalOpen(false)}
                    onDecksAdded={handleRefresh} 
                />
            )}
            {deckToRemove && (
                <ConfirmationModal
                    title="Remove Deck"
                    message={`Are you sure you want to remove "${deckToRemove.title}" from this subject? This will not delete the deck itself.`}
                    onConfirm={handleConfirmRemove}
                    onCancel={() => setDeckToRemove(null)}
                    confirmText="Remove Deck"
                    isConfirming={isRemoving}
                    error={error}
                />
            )}
            <div className="space-y-6">
                 {isLoading ? (
                    <div className="text-center p-12 text-primary-500 dark:text-gray-400">Loading decks...</div>
                ) : decks.length === 0 ? (
                    <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-primary-600 dark:text-gray-200">No decks yet!</h2>
                        <p className="text-primary-500 dark:text-gray-400 mt-2 mb-6">Add a study deck to this subject for your students.</p>
                         <button onClick={() => setIsModalOpen(true)} className="flex mx-auto items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700">
                            <PlusCircleIcon className="w-6 h-6" />
                            Add Deck
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end gap-2">
                            <button onClick={handleRefresh} disabled={isLoading} className="p-3 text-primary-600 dark:text-gray-300 bg-primary-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Refresh decks">
                                <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700">
                                <PlusCircleIcon className="w-6 h-6" />
                                Add Deck
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {decks.map(deck => (
                                <div key={deck.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-primary-200 dark:border-gray-700 flex flex-col justify-between group relative">
                                    <div className="absolute top-2 right-2 z-10">
                                        <button
                                            onClick={() => setMenuOpenForDeck(deck.id)}
                                            className="p-2 rounded-full text-primary-400 dark:text-gray-500 hover:bg-primary-100 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            aria-label="Deck options"
                                        >
                                            <EllipsisVerticalIcon className="w-6 h-6" />
                                        </button>
                                        {menuOpenForDeck === deck.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-primary-200 dark:border-gray-600 animate-[fade-in_0.1s_ease-out]">
                                                <button
                                                    onClick={() => {
                                                        setError(null);
                                                        setDeckToRemove(deck);
                                                        setMenuOpenForDeck(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                                >
                                                   <TrashIcon className="w-4 h-4" /> 
                                                   Remove from Subject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                                        <h2 className="text-xl font-bold text-primary-700 dark:text-gray-200 pr-8">{deck.title}</h2>
                                        <div className="flex items-center text-sm text-primary-500 dark:text-gray-400 capitalize mt-1">
                                            {deck.mode.toLowerCase()} Mode
                                            {deck.is_assessment && (
                                                <span className="ml-3 text-xs font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-full">
                                                    Assessment
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* The button below is intentionally left empty to preserve layout, actions are now in the menu */}
                                    <div className="mt-4 h-9"></div> 
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

const MembersTab: React.FC<{ subject: Subject; setPendingRequestCount: (count: number) => void; }> = ({ subject, setPendingRequestCount }) => {
    const [pendingMembers, setPendingMembers] = useState<SubjectEnrollment[]>([]);
    const [approvedMembers, setApprovedMembers] = useState<SubjectEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [processingId, setProcessingId] = useState<string | null>(null);
    
    const handleRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const fetchMembers = async () => {
            if (isMounted) {
                setIsLoading(true);
                setError(null);
            }
            try {
                const { data, error: fetchError } = await supabase
                    .from('subject_enrollments')
                    .select('id, status, profiles(full_name, course)')
                    .eq('subject_id', parseInt(subject.id, 10))
                    .abortSignal(controller.signal);
                
                if (!isMounted) return;
                if (fetchError) throw fetchError;
                
                // FIX: Use unknown cast to handle potential type mismatch with Supabase return type
                const allMembers = (data || []) as unknown as SubjectEnrollment[];
                const pending = allMembers.filter(m => m.status === EnrollmentStatus.PENDING);
                const approved = allMembers.filter(m => m.status === EnrollmentStatus.APPROVED);

                if (isMounted) {
                    setPendingMembers(pending);
                    setApprovedMembers(approved);
                    setPendingRequestCount(pending.length);
                }

            } catch (err) {
                if (!isMounted) return;
                if (err instanceof Error && err.name === 'AbortError') {
                    setError('Failed to load members: The request timed out.');
                } else {
                    setError(getErrorMessage(err));
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchMembers();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [subject.id, setPendingRequestCount, refreshTrigger]);

    const handleApprove = async (enrollmentId: string) => {
        setProcessingId(enrollmentId);
        try {
            const { error } = await supabase.rpc('approve_enrollment_request', { 
                enrollment_id: enrollmentId 
            });
            if (error) throw error;
            handleRefresh(); // Re-fetch to update lists
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (enrollmentId: string) => {
        setProcessingId(enrollmentId);
        try {
            const { error } = await supabase
                .from('subject_enrollments')
                .delete()
                .eq('id', enrollmentId);
            if (error) throw error;
            handleRefresh(); // Re-fetch to update lists
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setProcessingId(null);
        }
    };
    
    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Pending Requests */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-primary-600 dark:text-gray-200 mb-4">Pending Requests ({isLoading ? '...' : pendingMembers.length})</h3>
                {isLoading ? (
                    <div className="text-center p-8 text-primary-500 dark:text-gray-400">Loading requests...</div>
                ) : pendingMembers.length === 0 ? (
                    <div className="text-center p-8 bg-primary-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-primary-600 dark:text-gray-300">There are no pending enrollment requests.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-primary-200 dark:divide-gray-700">
                        {pendingMembers.map((member) => (
                            <li key={member.id} className="py-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <ProfileAvatar className="w-12 h-12" />
                                    <div>
                                        <p className="font-semibold text-primary-700 dark:text-gray-200">{member.profiles.full_name}</p>
                                        <p className="text-sm text-primary-500 dark:text-gray-400">{member.profiles.course || 'No course specified'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 self-end sm:self-center">
                                    <button 
                                        onClick={() => handleDeny(member.id)} 
                                        disabled={processingId === member.id}
                                        className="font-semibold bg-red-100 text-red-700 rounded-md py-1.5 px-4 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === member.id ? '...' : 'Deny'}
                                    </button>
                                    <button 
                                        onClick={() => handleApprove(member.id)} 
                                        disabled={processingId === member.id}
                                        className="font-semibold bg-green-100 text-green-700 rounded-md py-1.5 px-4 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === member.id ? '...' : 'Approve'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {/* Enrolled Students */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-primary-600 dark:text-gray-200">Enrolled Students ({isLoading ? '...' : approvedMembers.length})</h3>
                    <button onClick={handleRefresh} disabled={isLoading} className="p-2 text-primary-600 dark:text-gray-300 bg-primary-200 dark:bg-gray-700 rounded-lg transition-colors hover:bg-primary-300/80 dark:hover:bg-gray-600 disabled:opacity-50" aria-label="Refresh members">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {isLoading ? (
                     <div className="text-center p-12 text-primary-500 dark:text-gray-400">Loading members...</div>
                ) : approvedMembers.length === 0 ? (
                     <div className="text-center p-12 bg-primary-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-primary-600 dark:text-gray-300">No students have been approved for this subject yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-primary-200 dark:divide-gray-700">
                        {approvedMembers.map((member) => (
                            <li key={member.id} className="py-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <ProfileAvatar className="w-12 h-12" />
                                    <div>
                                        <p className="font-semibold text-primary-700 dark:text-gray-200">{member.profiles.full_name}</p>
                                        <p className="text-sm text-primary-500 dark:text-gray-400">{member.profiles.course || 'No course specified'}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeny(member.id)} 
                                    disabled={processingId === member.id}
                                    className="self-end sm:self-center font-semibold text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processingId === member.id ? 'Processing...' : 'Remove'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


const InfoTab: React.FC<{subject: Subject; onBack: () => void; onEdit: () => void;}> = ({ subject, onBack, onEdit }) => {
    const [copied, setCopied] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(subject.subject_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const { error } = await supabase.rpc('delete_subject', {
                subject_id_to_delete: parseInt(subject.id, 10)
            });

            if (error) throw error;
            onBack(); // Navigate back on success
        } catch (err) {
            setDeleteError(getErrorMessage(err));
            setIsDeleting(false); // Only stop loading on error
        }
    };

    return (
        <>
            {showDeleteModal && (
                <ConfirmationModal
                    title="Delete Subject"
                    message={`Are you sure you want to permanently delete "${subject.title}"? This will un-enroll all students and remove all assigned decks. This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                    confirmText="Delete Subject"
                    isConfirming={isDeleting}
                    error={deleteError}
                />
            )}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full border border-primary-200 dark:border-gray-700 space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-200 mb-4">Subject Code</h3>
                    <p className="text-primary-500 dark:text-gray-400 mb-2">Share this code with your students so they can request to enroll.</p>
                    <div className="bg-primary-100 dark:bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-2xl font-mono tracking-wider text-primary-700 dark:text-gray-200">{subject.subject_code}</span>
                        <button onClick={handleCopy} className="font-semibold bg-primary-200 dark:bg-gray-600 text-primary-600 dark:text-gray-200 rounded-md py-1 px-4 hover:bg-primary-300 dark:hover:bg-gray-500 w-24">
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-200 mb-4">Settings</h3>
                    <div className="space-y-3">
                         <button 
                            onClick={onEdit}
                            className="w-full text-left font-semibold text-primary-700 dark:text-gray-300 bg-primary-100 dark:bg-gray-700 p-3 rounded-lg hover:bg-primary-200 dark:hover:bg-gray-600"
                         >
                            Edit Subject Details
                         </button>
                         <button 
                            onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
                            className="w-full text-left font-semibold text-red-600 bg-red-50 p-3 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                         >
                            Delete Subject
                         </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SubjectRoomPage;