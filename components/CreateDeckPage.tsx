
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupForm from './SetupForm';
import LoadingView from './LoadingView';
import { generateFlashcards } from '../services/geminiService';
import { GameMode, CardColor } from '../types';
import { getErrorMessage } from '../utils';
import { useAuth } from './AuthProvider';
import { supabase } from '../services/supabaseClient';

const CreateDeckPage: React.FC = () => {
    const { user, ensureProfile } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => {
        navigate(user ? '/your-cards' : '/login');
    };

    const handleSubmit = async (title: string, mode: GameMode, inputText: string, cardCount: number, color: CardColor, isAssessment: boolean) => {
        setIsLoading(true);
        setError(null);
        try {
            const cards = await generateFlashcards(inputText, cardCount, mode);
            const deckConfig = { title, mode, color, is_assessment: isAssessment };

            if (user) {
                // Ensure profile exists before database write to prevent FK violation and recursion
                await ensureProfile();

                // For logged-in users, create the deck and cards, then navigate to edit.
                const { data: newDeck, error: deckError } = await supabase
                    .from('decks')
                    .insert({ user_id: user.id, title, color, mode, is_assessment: isAssessment })
                    .select()
                    .single();
                if (deckError) throw deckError;

                const cardsToInsert = cards.map(card => ({
                    deck_id: newDeck.id,
                    question: card.question,
                    answer: (card as any).answer,
                    options: (card as any).options,
                    correctanswer: (card as any).correctanswer,
                }));
                
                const { error: cardsError } = await supabase.from('cards').insert(cardsToInsert);
                if (cardsError) throw cardsError;

                navigate(`/edit-deck/${newDeck.id}`);
            } else {
                // For guests, pass the generated data to the edit page via route state.
                navigate('/guest/edit', {
                    state: { cards, deckConfig, isNewDeck: true },
                });
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingView onCancel={() => setIsLoading(false)} />;
    }

    return (
        <SetupForm 
            onSubmit={handleSubmit}
            error={error}
            onBack={handleBack}
        />
    );
};

export default CreateDeckPage;
