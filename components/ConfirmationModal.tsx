
import React, { useState } from 'react';
import { CloseIcon } from './icons';

interface ConfirmationModalProps {
    onClose?: () => void; // Optional for modals where action is required
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    isConfirming: boolean;
    error: string | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    onCancel,
    onConfirm,
    title,
    message,
    confirmText,
    isConfirming,
    error
}) => {
    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-[fade-in_0.3s_ease-out]"
            onClick={onCancel}
        >
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            <div 
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md relative animate-[slide-in-up_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onCancel} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{title}</h2>
                <p className="text-primary-600 dark:text-gray-300 mb-6">{message}</p>
                
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600" 
                        disabled={isConfirming}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        className="text-lg font-bold bg-red-600 text-white rounded-lg py-2 px-6 transition-all hover:bg-red-700 disabled:opacity-50" 
                        disabled={isConfirming}
                    >
                        {isConfirming ? 'Confirming...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
