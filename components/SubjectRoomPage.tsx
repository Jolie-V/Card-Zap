import React, { useState, useEffect, useCallback } from 'react';
import { Subject, Deck, User, SubjectEnrollment, EnrollmentStatus } from '../types';
import { CardsIcon, UserGroupIcon, InformationCircleIcon, PlusCircleIcon, TrashIcon, ProfileAvatar, RefreshIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { CARD_COLORS } from '../constants';
import AddDeckToSubjectModal from './AddDeckToSubjectModal';
import ConfirmationModal from './ConfirmationModal';


interface SubjectRoomPageProps {
    subject: Subject;
    user: User;
    onBack: () => void;
}

type Tab = 'cards' | 'members' | 'info';

const SubjectRoomPage: React.FC<SubjectRoomPageProps> = ({ subject, user, onBack }) => {
    const [activeTab, setActiveTab] = useState<Tab>('cards');
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'cards':
                return <CardsTab subject={subject} user={user} />;
            case 'members':
                return <MembersTab subject={subject} setPendingRequestCount={setPendingRequestCount} />;
            case 'info':
                return <InfoTab subject={subject} onBack={onBack} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="w-full animate-[fade-in-up_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            
            <div className="mb-8">
                <button onClick={onBack} className="text-primary-500 hover:text-primary-700 font-semibold mb-4">&larr; Back to Subjects</button>
                <div className="flex items-center gap-4">
                    {subject.image_url ? (
                         <img src={subject.image_url} alt={subject.title} className="w-20 h-20 rounded-lg object-cover bg-primary-200" />
                    ) : (
                        <div className="w-20 h-20 rounded-lg bg-primary-200 flex-shrink-0"></div>
                    )}
                    <div>
                        <h1 className="text-4xl font-bold text-primary-700">{subject.title}</h1>
                        <p className="text-primary-500 mt-1">{subject.description || "No description provided."}</p>
                    </div>
                </div>
            </div>

            <div className="border-b border-primary-300 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <TabButton icon={CardsIcon} label="Cards" isActive={activeTab === 'cards'} onClick={() => setActiveTab('cards')} />
                    <TabButton icon={UserGroupIcon} label="Members" isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} notificationCount={pendingRequestCount} />
                    <TabButton icon={InformationCircleIcon} label="Info & Settings" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} />
                </nav>
            </div>
            
            <div>
                {renderTabContent()}
            </div>
        </div>
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
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-primary-400 hover:text-primary-600 hover:border-primary-400'
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


const CardsTab: React.FC<{subject: Subject, user: User}> = ({ subject, user }) => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchDecks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('subject_decks')
                .select('decks(*)')
                .eq('subject_id', subject.id);
            if (error) throw error;
            const assignedDecks = data?.map(item => item.decks).filter(Boolean) as Deck[] || [];
            setDecks(assignedDecks);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [subject.id]);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

    const handleRemoveDeck = async (deckId: number) => {
        if (!window.confirm("Are you sure you want to remove this deck from the subject? This won't delete the deck itself.")) return;
        setError(null);
        try {
            const { error } = await supabase
                .from('subject_decks')
                .delete()
                .match({ subject_id: subject.id, deck_id: deckId });
            if (error) throw error;
            setDecks(prev => prev.filter(d => d.id !== deckId));
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };
    
    if (error) {
        return <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>;
    }

    return (
        <>
            {isModalOpen && (
                <AddDeckToSubjectModal 
                    subject={subject} 
                    user={user}
                    onClose={() => setIsModalOpen(false)}
                    onDecksAdded={fetchDecks} 
                />
            )}
            <div className="space-y-6">
                 {isLoading ? (
                    <div className="text-center p-12 text-primary-500">Loading decks...</div>
                ) : decks.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl shadow-xl border border-primary-200">
                        <h2 className="text-2xl font-bold text-primary-600">No decks yet!</h2>
                        <p className="text-primary-500 mt-2 mb-6">Add a study deck to this subject for your students.</p>
                         <button onClick={() => setIsModalOpen(true)} className="flex mx-auto items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700">
                            <PlusCircleIcon className="w-6 h-6" />
                            Add Deck
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end gap-2">
                            <button onClick={fetchDecks} disabled={isLoading} className="p-3 text-primary-600 bg-primary-200 rounded-lg transition-colors hover:bg-primary-300/80 disabled:opacity-50" aria-label="Refresh decks">
                                <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700">
                                <PlusCircleIcon className="w-6 h-6" />
                                Add Deck
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {decks.map(deck => (
                                <div key={deck.id} className="bg-white p-6 rounded-xl shadow-lg border border-primary-200 flex flex-col justify-between group">
                                    <div>
                                        <div className={`w-12 h-12 rounded-lg ${CARD_COLORS[deck.color].bg} mb-4`}></div>
                                        <h2 className="text-xl font-bold text-primary-700">{deck.title}</h2>
                                        <p className="text-sm text-primary-500 capitalize mt-1">{deck.mode.toLowerCase()} Mode</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDeck(deck.id)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 font-semibold bg-red-50 text-red-600 rounded-md py-2 px-4 transition-colors hover:bg-red-100 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                        <TrashIcon className="w-5 h-5" /> Remove
                                    </button>
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

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('subject_enrollments')
                .select('id, status, profiles(full_name, course)')
                .eq('subject_id', subject.id);
            
            if (fetchError) throw fetchError;
            
            const allMembers = (data || []) as SubjectEnrollment[];
            const pending = allMembers.filter(m => m.status === EnrollmentStatus.PENDING);
            const approved = allMembers.filter(m => m.status === EnrollmentStatus.APPROVED);

            setPendingMembers(pending);
            setApprovedMembers(approved);
            setPendingRequestCount(pending.length);

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [subject.id, setPendingRequestCount]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleApprove = async (enrollmentId: number) => {
        try {
            const { error } = await supabase
                .from('subject_enrollments')
                .update({ status: EnrollmentStatus.APPROVED })
                .eq('id', enrollmentId);
            if (error) throw error;
            fetchMembers(); // Re-fetch to update lists
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDeny = async (enrollmentId: number) => {
        try {
            const { error } = await supabase
                .from('subject_enrollments')
                .delete()
                .eq('id', enrollmentId);
            if (error) throw error;
            fetchMembers(); // Re-fetch to update lists
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };
    
    if (error) {
        return <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>;
    }

    return (
        <div className="space-y-8">
            {/* Pending Requests */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-primary-200">
                <h3 className="text-xl font-bold text-primary-600 mb-4">Pending Requests ({isLoading ? '...' : pendingMembers.length})</h3>
                {isLoading ? (
                    <div className="text-center p-8 text-primary-500">Loading requests...</div>
                ) : pendingMembers.length === 0 ? (
                    <div className="text-center p-8 bg-primary-100 rounded-lg">
                        <p className="text-primary-600">There are no pending enrollment requests.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-primary-200">
                        {pendingMembers.map((member) => (
                            <li key={member.id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <ProfileAvatar className="w-12 h-12" />
                                    <div>
                                        <p className="font-semibold text-primary-700">{member.profiles.full_name}</p>
                                        <p className="text-sm text-primary-500">{member.profiles.course || 'No course specified'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDeny(member.id)} className="font-semibold bg-red-100 text-red-700 rounded-md py-1.5 px-4 hover:bg-red-200">Deny</button>
                                    <button onClick={() => handleApprove(member.id)} className="font-semibold bg-green-100 text-green-700 rounded-md py-1.5 px-4 hover:bg-green-200">Approve</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {/* Enrolled Students */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-primary-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-primary-600">Enrolled Students ({isLoading ? '...' : approvedMembers.length})</h3>
                    <button onClick={fetchMembers} disabled={isLoading} className="p-2 text-primary-600 bg-primary-200 rounded-lg transition-colors hover:bg-primary-300/80 disabled:opacity-50" aria-label="Refresh members">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {isLoading ? (
                     <div className="text-center p-12 text-primary-500">Loading members...</div>
                ) : approvedMembers.length === 0 ? (
                     <div className="text-center p-12 bg-primary-100 rounded-lg">
                        <p className="text-primary-600">No students have been approved for this subject yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-primary-200">
                        {approvedMembers.map((member) => (
                            <li key={member.id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <ProfileAvatar className="w-12 h-12" />
                                    <div>
                                        <p className="font-semibold text-primary-700">{member.profiles.full_name}</p>
                                        <p className="text-sm text-primary-500">{member.profiles.course || 'No course specified'}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeny(member.id)} className="font-semibold text-sm text-red-600 hover:text-red-800">Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


const InfoTab: React.FC<{subject: Subject; onBack: () => void;}> = ({ subject, onBack }) => {
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
                subject_id_to_delete: subject.id
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
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-primary-200 space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-primary-600 mb-4">Subject Code</h3>
                    <p className="text-primary-500 mb-2">Share this code with your students so they can request to enroll.</p>
                    <div className="bg-primary-100 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-2xl font-mono tracking-wider text-primary-700">{subject.subject_code}</span>
                        <button onClick={handleCopy} className="font-semibold bg-primary-200 text-primary-600 rounded-md py-1 px-4 hover:bg-primary-300 w-24">
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-primary-600 mb-4">Statistics</h3>
                    <div className="text-center p-12 bg-primary-100 rounded-lg">
                        <p className="text-primary-600">Subject statistics are coming soon.</p>
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-primary-600 mb-4">Settings</h3>
                    <div className="space-y-3">
                         <button className="w-full text-left font-semibold text-primary-700 bg-primary-100 p-3 rounded-lg hover:bg-primary-200 disabled:opacity-50 cursor-not-allowed">Rename Subject</button>
                         <button 
                            onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
                            className="w-full text-left font-semibold text-red-600 bg-red-50 p-3 rounded-lg hover:bg-red-100"
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