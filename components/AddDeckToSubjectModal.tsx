import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons';
import { Deck, Subject, User } from '../types';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';

interface AddDeckToSubjectModalProps {
    onClose: () => void;
    onDecksAdded: () => void;
    subject: Subject;
    user: User;
}

const AddDeckToSubjectModal: React.FC<AddDeckToSubjectModalProps> = ({ onClose, onDecksAdded, subject, user }) => {
    const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
    const [selectedDeckIds, setSelectedDeckIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDecks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch all decks owned by the teacher
                const { data: allDecks, error: allDecksError } = await supabase
                    .from('decks')
                    .select('*')
                    .eq('user_id', user.id);
                if (allDecksError) throw allDecksError;

                // Fetch decks already assigned to the subject
                const { data: assignedDecks, error: assignedDecksError } = await supabase
                    .from('subject_decks')
                    .select('deck_id')
                    .eq('subject_id', subject.id);
                if (assignedDecksError) throw assignedDecksError;
                
                const assignedDeckIds = new Set(assignedDecks.map(d => d.deck_id));
                
                // Filter out decks that are already assigned
                const unassignedDecks = (allDecks || []).filter(deck => !assignedDeckIds.has(deck.id));
                setAvailableDecks(unassignedDecks);

            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        };

        fetchDecks();
    }, [user.id, subject.id]);

    const handleToggleDeck = (deckId: number) => {
        setSelectedDeckIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(deckId)) {
                newSet.delete(deckId);
            } else {
                newSet.add(deckId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDeckIds.size === 0) {
            setError("Please select at least one deck to add.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        
        try {
            const decksToAdd = Array.from(selectedDeckIds).map(deck_id => ({
                subject_id: subject.id,
                deck_id: deck_id,
            }));

            const { error: insertError } = await supabase.from('subject_decks').insert(decksToAdd);
            if (insertError) throw insertError;
            
            onDecksAdded();
            onClose();

        } catch (err) {
            setError(getErrorMessage(err));
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-[fade-in_0.3s_ease-out]"
            onClick={onClose}
        >
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            <div 
                className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative animate-[slide-in-up_0.3s_ease-out] flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="flex-shrink-0">
                    <h2 className="text-2xl font-bold text-primary-700 mb-2">Add Decks to "{subject.title}"</h2>
                    <p className="text-primary-500 mb-6">Select from your existing decks to assign to this subject.</p>
                </div>
                
                {error && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-4 flex-shrink-0">{error}</div>}

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
                    {isLoading ? (
                        <p className="text-primary-500 text-center">Loading your decks...</p>
                    ) : availableDecks.length === 0 ? (
                        <p className="text-primary-500 text-center py-8">You have no other decks to add.</p>
                    ) : (
                        <ul className="space-y-3">
                            {availableDecks.map(deck => (
                                <li key={deck.id}>
                                    <label className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedDeckIds.has(deck.id) ? 'border-primary-500 bg-primary-100/50' : 'border-primary-200 hover:border-primary-400'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedDeckIds.has(deck.id)}
                                            onChange={() => handleToggleDeck(deck.id)}
                                            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="font-semibold text-primary-700">{deck.title}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </form>
                <div className="flex justify-end gap-4 pt-6 flex-shrink-0">
                    <button type="button" onClick={onClose} className="text-lg font-bold bg-primary-200 text-primary-600 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-2 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={isSubmitting || isLoading || availableDecks.length === 0}>
                        {isSubmitting ? 'Adding...' : `Add ${selectedDeckIds.size} Deck(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDeckToSubjectModal;
