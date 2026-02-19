
import React, { useState, useEffect } from 'react';
import { CloseIcon, RefreshIcon } from './icons';

interface EnrollSubjectModalProps {
    onClose: () => void;
    onEnroll: (subjectCode: string) => Promise<void>;
    isSubmitting: boolean;
    error: string | null;
}

const EnrollSubjectModal: React.FC<EnrollSubjectModalProps> = ({ onClose, onEnroll, isSubmitting, error }) => {
    const [subjectCode, setSubjectCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEnroll(subjectCode.trim());
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
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md relative animate-[slide-in-up_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100 mb-6">Enroll in a Subject</h2>
                
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="subject-code" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Subject Code</label>
                        <input
                            id="subject-code"
                            type="text"
                            value={subjectCode}
                            onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                            className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono tracking-widest"
                            placeholder="A1B2C3D4"
                            required
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-primary-500 dark:text-gray-400 mt-1">Ask your teacher for the subject code.</p>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-2 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Enrolling...' : 'Enroll'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EnrollSubjectModal;