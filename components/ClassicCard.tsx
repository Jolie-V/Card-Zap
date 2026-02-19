import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CardColor, ClassicFlashcard } from '../types';
import { CARD_COLORS } from '../constants';
import { XCircleIcon, CheckCircleIcon } from './icons';

interface ClassicCardProps {
    card: ClassicFlashcard;
    onAnswer: (isCorrect: boolean) => void;
    color: CardColor;
}

const DRAG_THRESHOLD = 100; // pixels to trigger answer
const CLICK_THRESHOLD = 10; // pixels to distinguish click from drag

const ClassicCard: React.FC<ClassicCardProps> = ({ card, onAnswer, color }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    const handleAnswer = useCallback((isCorrect: boolean) => {
        if (exitDirection) return;
        setExitDirection(isCorrect ? 'right' : 'left');
        onAnswer(isCorrect);
    }, [onAnswer, exitDirection]);

    const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (exitDirection) return;

        setIsDragging(true);
        hasDragged.current = false;
        const point = 'touches' in e ? e.touches[0] : e;
        dragStartPos.current = { 
            x: point.clientX - dragOffset.x, 
            y: point.clientY - dragOffset.y 
        };
        
        e.preventDefault();
    }, [exitDirection, dragOffset]);

    const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;

        // Only allow dragging if the card is flipped.
        if (!isFlipped) return;

        const point = 'touches' in e ? e.touches[0] : e;
        const newX = point.clientX - dragStartPos.current.x;
        const newY = point.clientY - dragStartPos.current.y;
        
        if (!hasDragged.current && (Math.abs(newX) > CLICK_THRESHOLD || Math.abs(newY) > CLICK_THRESHOLD)) {
            hasDragged.current = true;
        }
        
        setDragOffset({ x: newX, y: newY });
    }, [isDragging, isFlipped]);

    const handleInteractionEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);

        if (hasDragged.current) {
            // This was a drag/swipe gesture; only process if card is flipped.
            if (isFlipped) {
                if (dragOffset.x > DRAG_THRESHOLD) {
                    handleAnswer(true); // Swipe right
                    return;
                } else if (dragOffset.x < -DRAG_THRESHOLD) {
                    handleAnswer(false); // Swipe left
                    return;
                }
            }
        } else {
            // This was a click/tap gesture; toggle flip.
            setIsFlipped(prev => !prev);
        }
        
        // Snap back to center if it was not a valid answer swipe.
        setDragOffset({ x: 0, y: 0 });
    }, [isDragging, dragOffset, handleAnswer, isFlipped]);
    
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleInteractionMove);
            window.addEventListener('touchmove', handleInteractionMove);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchend', handleInteractionEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('touchmove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, handleInteractionMove, handleInteractionEnd]);

    const colorClasses = CARD_COLORS[color];
    
    const dynamicStyle: React.CSSProperties = {
        transform: `
            translateX(${dragOffset.x}px) 
            rotate(${isFlipped ? dragOffset.x / 20 : 0}deg) 
            rotateY(${isFlipped ? 180 : 0}deg)
        `,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        cursor: isFlipped ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        touchAction: 'none',
    };

    const initialAnimationClass = !exitDirection ? 'animate-[slide-in-up_0.4s_ease-out]' : '';
    const exitClass = 
        exitDirection === 'right' ? 'animate-[slide-out-right_0.3s_ease-in-out_forwards]' :
        exitDirection === 'left' ? 'animate-[slide-out-left_0.3s_ease-in-out_forwards]' : '';

    const indicatorOpacity = (offset: number) => {
        if (!isFlipped || !hasDragged.current) return 0;
        return Math.max(0, Math.min(1, offset / DRAG_THRESHOLD));
    }

    const rightIndicatorOpacity = indicatorOpacity(dragOffset.x);
    const leftIndicatorOpacity = indicatorOpacity(-dragOffset.x);
    
    return (
        <div className="w-full perspective-[1000px] flex justify-center items-center">
            <style>
                {`
                .perspective-\\[1000px\\] { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden; }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-in-up {
                    from { transform: translateY(50px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes slide-out-left {
                    from { transform: translateX(0) rotate(0); opacity: 1; }
                    to { transform: translateX(-150%) rotate(-15deg); opacity: 0; }
                }
                @keyframes slide-out-right {
                    from { transform: translateX(0) rotate(0); opacity: 1; }
                    to { transform: translateX(150%) rotate(15deg); opacity: 0; }
                }
                `}
            </style>
            <div
                className={`relative w-full max-w-xl h-80 sm:h-96 preserve-3d ${exitClass || initialAnimationClass}`}
                style={dynamicStyle}
                onMouseDown={handleInteractionStart}
                onTouchStart={handleInteractionStart}
            >
                {/* Front of card */}
                <div className={`absolute w-full h-full ${colorClasses.bg} rounded-2xl shadow-2xl p-8 flex items-center justify-center text-center backface-hidden`}>
                    <p className={`text-2xl sm:text-3xl font-semibold ${colorClasses.text}`}>{card.question}</p>
                </div>
                {/* Back of card */}
                <div className={`absolute w-full h-full ${colorClasses.bg} rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 overflow-hidden`}>
                    
                    {/* Swipe Overlays */}
                    <div
                        className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center text-white font-extrabold text-3xl tracking-wider uppercase transition-opacity pointer-events-none"
                        style={{ opacity: leftIndicatorOpacity }}
                    >
                        <XCircleIcon className="w-16 h-16 mb-4" />
                        <span>Wrong</span>
                    </div>
                    <div
                        className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center text-white font-extrabold text-3xl tracking-wider uppercase transition-opacity pointer-events-none"
                        style={{ opacity: rightIndicatorOpacity }}
                    >
                        <CheckCircleIcon className="w-16 h-16 mb-4" />
                        <span>Correct</span>
                    </div>
                    
                    <p 
                        className={`text-xl sm:text-2xl font-medium ${colorClasses.text} flex-grow flex items-center transition-opacity duration-200`}
                        style={{ opacity: 1 - Math.max(leftIndicatorOpacity, rightIndicatorOpacity) }}
                    >
                        {card.answer}
                    </p>

                    {/* Hold-to-swipe hint overlay */}
                    <div 
                        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to right, rgba(239, 68, 68, 0.4), transparent 40%, transparent 60%, rgba(16, 185, 129, 0.4))',
                            opacity: isDragging && isFlipped && !hasDragged.current ? 1 : 0,
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default ClassicCard;
