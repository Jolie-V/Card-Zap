
import React, { useState } from 'react';
import { CloseIcon } from './icons';
import { Subject } from '../types';

interface EditSubjectModalProps {
    subject: Subject;
    onClose: () => void;
    onUpdate: (subjectData: { title: string; description?: string; image_url?: string; }) => Promise<void>;
    isSubmitting: boolean;
    error: string | null;
}

const EditSubjectModal: React.FC<EditSubjectModalProps> = ({ subject, onClose, onUpdate, isSubmitting, error }) => {
    const [title, setTitle] = useState(subject.title);
    const [description, setDescription] = useState(subject.description || '');
    const [imagePreview, setImagePreview] = useState<string | null>(subject.image_url || null);
    const [formError, setFormError] = useState('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setFormError("Image file is too large. Please select a file under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setFormError('Subject title cannot be empty.');
            return;
        }
        onUpdate({
            title,
            description: description.trim() || undefined,
            image_url: imagePreview || undefined,
        });
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
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg relative animate-[slide-in-up_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100 mb-6">Edit Subject</h2>
                
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{error}</div>
                )}
                {formError && <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">{formError}</div>}


                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="subject-title" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Subject Title</label>
                        <input
                            id="subject-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="e.g., Introduction to Biology"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="subject-photo" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Subject Photo (Optional)</label>
                        <div className="mt-2 flex items-center gap-4">
                            <div className="w-24 h-24 bg-primary-100 dark:bg-gray-700 rounded-md flex-shrink-0 overflow-hidden">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Subject preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary-300 dark:text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                            </div>
                            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 dark:text-primary-300 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 ${isSubmitting ? 'opacity-50' : ''}`}>
                                <span>Change image</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="subject-description" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Description (Optional)</label>
                        <textarea
                            id="subject-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="Briefly describe what this subject is about."
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-lg font-bold bg-primary-200 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80 dark:hover:bg-gray-600" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-2 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSubjectModal;