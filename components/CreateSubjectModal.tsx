import React, { useState } from 'react';
import { CloseIcon } from './icons';

interface CreateSubjectModalProps {
    onClose: () => void;
    onCreate: (subjectData: { name: string; description?: string; image_url?: string; }) => void;
    isSubmitting: boolean;
    error: string | null;
}

const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({ onClose, onCreate, isSubmitting, error }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [formError, setFormError] = useState('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Basic validation for file size (e.g., 2MB)
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
        if (!name.trim()) {
            setFormError('Subject name is required.');
            return;
        }
        onCreate({
            name,
            description: description.trim() || undefined, // Send undefined if empty
            image_url: imagePreview || undefined,
        });
    };

    const isSchemaError = error?.startsWith('SCHEMA_CACHE_ERROR:');
    const errorMessage = error?.replace('SCHEMA_CACHE_ERROR:', '');

    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-[fade-in_0.3s_ease-out]"
            onClick={onClose}
        >
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            <div 
                className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg relative animate-[slide-in-up_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-primary-700 mb-6">Create a New Subject</h2>
                
                {error && (
                    isSchemaError ? (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 rounded-r-lg" role="alert">
                            <p className="font-bold">Database Out of Sync</p>
                            <p className="text-sm mt-1">{errorMessage}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-3 text-sm font-semibold bg-yellow-200 text-yellow-800 rounded px-3 py-1.5 hover:bg-yellow-300"
                            >
                                Refresh Page to Sync
                            </button>
                        </div>
                    ) : (
                        <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-4">{error}</div>
                    )
                )}
                {formError && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-4">{formError}</div>}


                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="subject-name" className="block text-sm font-medium text-primary-600 mb-2">Subject Name</label>
                        <input
                            id="subject-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="e.g., Introduction to Biology"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="subject-photo" className="block text-sm font-medium text-primary-600 mb-2">Subject Photo (Optional)</label>
                        <div className="mt-2 flex items-center gap-4">
                            <div className="w-24 h-24 bg-primary-100 rounded-md flex-shrink-0 overflow-hidden">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Subject preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                            </div>
                            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 ${isSubmitting ? 'opacity-50' : ''}`}>
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="subject-description" className="block text-sm font-medium text-primary-600 mb-2">Description (Optional)</label>
                        <textarea
                            id="subject-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            placeholder="Briefly describe what this subject is about."
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-lg font-bold bg-primary-200 text-primary-600 rounded-lg py-2 px-6 transition-all hover:bg-primary-300/80" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-2 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSubjectModal;