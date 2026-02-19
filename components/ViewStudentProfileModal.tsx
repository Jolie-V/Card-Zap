import React from 'react';
import { CloseIcon, UserIcon } from './icons';
import { AdminStudentView } from '../types';

interface ViewStudentProfileModalProps {
    student: AdminStudentView;
    onClose: () => void;
}

const ViewStudentProfileModal: React.FC<ViewStudentProfileModalProps> = ({ student, onClose }) => {
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
                
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 mb-4">
                        {student.avatar_url ? (
                            <img className="h-full w-full rounded-full object-cover" src={student.avatar_url} alt={student.full_name} />
                        ) : (
                            <div className="h-full w-full rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                {student.full_name ? <span className="text-4xl">{student.full_name.charAt(0).toUpperCase()}</span> : <UserIcon className="w-12 h-12" />}
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100">{student.full_name}</h2>
                    <p className="text-primary-500 dark:text-gray-400">{student.email}</p>
                </div>

                <div className="mt-8 border-t border-primary-200 dark:border-gray-700 pt-6 space-y-4">
                    <div className="flex justify-between">
                        <span className="font-semibold text-primary-600 dark:text-gray-300">Course:</span>
                        <span className="text-primary-800 dark:text-gray-100 text-right">{student.course || <span className="italic text-primary-400 dark:text-gray-500">Not set</span>}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-primary-600 dark:text-gray-300">Date Joined:</span>
                        <span className="text-primary-800 dark:text-gray-100 text-right">{new Date(student.created_at).toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                     <button onClick={onClose} className="text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
export default ViewStudentProfileModal;
