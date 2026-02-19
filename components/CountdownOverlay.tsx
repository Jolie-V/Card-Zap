
import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
    onFinish: () => void;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ onFinish }) => {
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (count === 0) {
            // Small delay to show "GO!" before finishing
            const finishTimer = setTimeout(() => {
                onFinish();
            }, 800); 
            return () => clearTimeout(finishTimer);
        }

        const timer = setTimeout(() => {
            setCount(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [count, onFinish]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
            {/* Background with app-themed gradient and blur */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900 animate-gradient-xy"></div>
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
            
            {/* Animated particles/circles using app colors */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>

            <style>{`
                @keyframes zoom-in-out {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 0; }
                }
                @keyframes go-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(1.2); opacity: 1; }
                }
                .animate-gradient-xy {
                    background-size: 200% 200%;
                    animation: gradient-xy 15s ease infinite;
                }
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>

            <div className="relative text-center z-10 flex flex-col items-center">
                {count > 0 ? (
                    <>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white/90 mb-8 uppercase tracking-[0.2em] animate-[fade-in_0.5s]">Get Ready</h2>
                        <div key={count} className="text-[10rem] sm:text-[15rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-[zoom-in-out_0.9s_ease-out_forwards]">
                            {count}
                        </div>
                    </>
                ) : (
                    <div className="text-[8rem] sm:text-[12rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-primary-100 via-white to-primary-200 drop-shadow-[0_0_50px_rgba(255,255,255,0.6)] animate-[go-pop_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
                        GO!
                    </div>
                )}
            </div>
        </div>
    );
};

export default CountdownOverlay;
