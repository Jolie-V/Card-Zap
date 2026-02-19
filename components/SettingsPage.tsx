
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserRole, ThemePreference } from '../types';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { SunIcon, MoonIcon, ProfileAvatar, TrashIcon } from './icons';
import { useAuth } from './AuthProvider';

const SettingsPage: React.FC = () => {
    const { user, updateUserProfile, updateUserAvatar, removeUserAvatar } = useAuth();
    
    // Profile State
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [course, setCourse] = useState(user?.course || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Avatar State
    const [isUploading, setIsUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(user) {
            setFullName(user.full_name);
            setCourse(user.course || '');
        }
    }, [user]);

    const effectiveTheme = useMemo(() => {
        if (!user || user.preferred_theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return user.preferred_theme;
    }, [user?.preferred_theme]);

    const handleThemeChange = async (newTheme: ThemePreference) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ preferred_theme: newTheme })
                .eq('id', user.id);
            if (error) throw error;
            updateUserProfile({ preferred_theme: newTheme });
        } catch (err) {
            // Handle theme update error if necessary
            console.error("Failed to update theme", getErrorMessage(err));
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setSaveSuccess(null);
        setSaveError(null);

        const updates: { full_name: string; course?: string } = {
            full_name: fullName,
        };
        if (user.role === UserRole.STUDENT) {
            updates.course = course;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);
            
            if (error) throw error;
            
            updateUserProfile(updates);
            setSaveSuccess('Profile updated successfully!');
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch (err) {
            setSaveError(`Failed to update profile: ${getErrorMessage(err)}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setAvatarError("Image must be smaller than 2MB.");
            return;
        }

        setIsUploading(true);
        setAvatarError(null);
        try {
            await updateUserAvatar(file);
        } catch (err) {
            setAvatarError(`Upload failed: ${getErrorMessage(err)}`);
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveClick = async () => {
        if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
        setIsUploading(true);
        setAvatarError(null);
        try {
            await removeUserAvatar();
        } catch (err) {
            setAvatarError(`Failed to remove avatar: ${getErrorMessage(err)}`);
        } finally {
            setIsUploading(false);
        }
    };
    
    if (!user) {
        return <p>Loading user settings...</p>;
    }

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-[fade-in-up_0.5s_ease-out] pb-12">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100 mb-6">Profile Picture</h2>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                        <ProfileAvatar className="w-24 h-24" />
                    )}
                    <div className="flex-grow w-full sm:w-auto">
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/png, image/jpeg"
                                className="hidden"
                                id="avatar-upload"
                                disabled={isUploading}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="font-semibold bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-gray-300 rounded-md py-2 px-4 transition-colors hover:bg-primary-200 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                {isUploading ? 'Processing...' : 'Upload Picture'}
                            </button>
                            {user.avatar_url && (
                                <button
                                    onClick={handleRemoveClick}
                                    disabled={isUploading}
                                    className="font-semibold text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                         {avatarError && <p className="text-red-500 text-sm mt-2">{avatarError}</p>}
                         <p className="text-xs text-primary-500 dark:text-gray-400 mt-2">Recommended: Square image under 2MB.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100 mb-6">Appearance</h2>
                <div className="flex items-center justify-between">
                    <p className="text-primary-600 dark:text-gray-300">Theme</p>
                    <div className="flex items-center gap-2 p-1 rounded-full bg-primary-100 dark:bg-gray-700">
                        <button onClick={() => handleThemeChange(ThemePreference.LIGHT)} className={`p-2 rounded-full transition-colors ${effectiveTheme === 'light' ? 'bg-white shadow' : 'hover:bg-white/50'}`}>
                            <SunIcon className="w-6 h-6 text-yellow-500" />
                        </button>
                        <button onClick={() => handleThemeChange(ThemePreference.DARK)} className={`p-2 rounded-full transition-colors ${effectiveTheme === 'dark' ? 'bg-gray-600 shadow' : 'hover:bg-gray-600/50'}`}>
                            <MoonIcon className="w-6 h-6 text-blue-300" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-primary-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-primary-700 dark:text-gray-100 mb-6">Edit Profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="full-name" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Full Name</label>
                        <input
                            id="full-name"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            required
                        />
                    </div>
                    {user.role === UserRole.STUDENT && (
                        <div>
                            <label htmlFor="course" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Course</label>
                            <input
                                id="course"
                                type="text"
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                placeholder="e.g. Computer Science"
                                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                        </div>
                    )}
                     {saveError && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg" role="alert">{saveError}</div>}
                     {saveSuccess && <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg" role="alert">{saveSuccess}</div>}

                    <div className="flex justify-end">
                         <button type="submit" disabled={isSaving || (fullName === user.full_name && course === (user.course || ''))} className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-2 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
