import React from 'react';
import { ArrowLongLeftIcon, ArrowLongRightIcon } from './icons';

interface StudyTutorialProps {
    onClose: () => void;
}

const StudyTutorial: React.FC<StudyTutorialProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                
                @keyframes tutorial-flip {
                    0%, 100% { transform: rotateY(0deg); }
                    50% { transform: rotateY(180deg); }
                }
                
                @keyframes tutorial-swipe {
                    0%, 100% { transform: translateX(0) rotate(0deg); opacity: 1; }
                    20% { transform: translateX(-40px) rotate(-10deg); opacity: 0; } /* Swipe Left */
                    25% { transform: translateX(0) rotate(0deg); opacity: 0; } /* Reset invisible */
                    30% { transform: translateX(0) rotate(0deg); opacity: 1; } /* Reappear */
                    70% { transform: translateX(0) rotate(0deg); opacity: 1; } /* Wait */
                    90% { transform: translateX(40px) rotate(10deg); opacity: 0; } /* Swipe Right */
                    95% { transform: translateX(0) rotate(0deg); opacity: 0; }
                }

                @keyframes hand-tap {
                    0%, 100% { transform: scale(1); opacity: 0; }
                    40% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(0.8); opacity: 1; }
                    60% { transform: scale(1); opacity: 0; }
                }

                .perspective-container {
                    perspective: 1000px;
                }
                .tutorial-card {
                    transform-style: preserve-3d;
                }
                .tutorial-card-face {
                    backface-visibility: hidden;
                }
                .tutorial-card-back {
                    transform: rotateY(180deg);
                }
            `}</style>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-primary-200 dark:border-gray-700 relative overflow-hidden">
                {/* Decorative background blobs */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary-100 dark:bg-primary-900/30 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700 dark:from-primary-300 dark:to-primary-500 mb-8">
                        How to Study
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                        {/* Flip Instruction */}
                        <div className="flex flex-col items-center">
                            <div className="h-32 w-full bg-primary-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-center mb-4 relative perspective-container group">
                                <div className="w-20 h-28 relative tutorial-card animate-[tutorial-flip_3s_infinite_ease-in-out]">
                                    {/* Front */}
                                    <div className="absolute inset-0 bg-white dark:bg-gray-600 border-2 border-primary-200 dark:border-gray-500 rounded-lg shadow-md flex items-center justify-center tutorial-card-face">
                                        <div className="w-8 h-1 bg-primary-200 dark:bg-gray-500 rounded mb-2"></div>
                                        <div className="w-10 h-1 bg-primary-200 dark:bg-gray-500 rounded mb-2"></div>
                                        <div className="w-6 h-1 bg-primary-200 dark:bg-gray-500 rounded"></div>
                                    </div>
                                    {/* Back */}
                                    <div className="absolute inset-0 bg-primary-100 dark:bg-gray-700 border-2 border-primary-300 dark:border-gray-500 rounded-lg shadow-md flex flex-col items-center justify-center tutorial-card-face tutorial-card-back">
                                        <div className="text-2xl">💡</div>
                                    </div>
                                </div>
                                <div className="absolute w-12 h-12 bg-gray-400/20 rounded-full animate-[hand-tap_3s_infinite_ease-in-out]" style={{top: '60%', left: '50%', transform: 'translate(-50%, -50%)'}}></div>
                            </div>
                            <h3 className="font-bold text-lg text-primary-700 dark:text-gray-100 mb-1">Tap to Flip</h3>
                            <p className="text-primary-500 dark:text-gray-400 text-sm">Reveal the answer</p>
                        </div>

                        {/* Swipe Instruction */}
                        <div className="flex flex-col items-center">
                            <div className="h-32 w-full bg-primary-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden">
                                 {/* Background indicators for swipe */}
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center text-red-300 dark:text-red-900/50">
                                    <ArrowLongLeftIcon className="w-6 h-6" />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center text-green-300 dark:text-green-900/50">
                                    <ArrowLongRightIcon className="w-6 h-6" />
                                </div>

                                <div className="w-20 h-28 bg-white dark:bg-gray-600 border-2 border-primary-200 dark:border-gray-500 rounded-lg shadow-md flex items-center justify-center z-10 animate-[tutorial-swipe_3s_infinite_ease-in-out]">
                                    <div className="text-xl">✅</div>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-primary-700 dark:text-gray-100 mb-1">Swipe to Score</h3>
                            <div className="text-xs flex gap-4 justify-center text-primary-400 dark:text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Wrong</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> Correct</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl py-3 px-10 shadow-lg shadow-primary-500/30 transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/50 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Let's Start!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudyTutorial;