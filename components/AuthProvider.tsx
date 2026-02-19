
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { User, UserRole, ThemePreference } from '../types';
import { getErrorMessage } from '../utils';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loadingInitial: boolean;
    loading: boolean;
    error: string | null;
    signIn: (credentials: { email: string; password: string }) => Promise<void>;
    signUp: (credentials: { email: string; password: string; role: UserRole; fullName: string; course: string }) => Promise<void>;
    signOut: () => Promise<void>;
    updateUserProfile: (updates: Partial<User>) => void;
    updateUserAvatar: (file: File) => Promise<void>;
    removeUserAvatar: () => Promise<void>;
    ensureProfile: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper to construct user from session data alone (Offline/Fallback mode)
    const createFallbackUser = (authUser: SupabaseUser): User => {
        const metadata = authUser.user_metadata || {};
        return {
            id: authUser.id,
            email: authUser.email || '',
            role: (metadata.role as UserRole) || UserRole.STUDENT,
            full_name: metadata.full_name || authUser.email?.split('@')[0] || 'User',
            course: metadata.course,
            preferred_theme: (metadata.preferred_theme as ThemePreference) || ThemePreference.SYSTEM,
            avatar_url: metadata.avatar_url
        };
    };

    // New method: Explicitly ensure profile exists in DB.
    // Call this before performing actions that require FK constraints (like creating decks/subjects).
    const ensureProfile = useCallback(async (): Promise<void> => {
        if (!user) return;
        
        try {
            // 1. Check if profile exists (fast check)
            const { data, error: selectError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!selectError && data) return; // Exists, we are good.

            console.log("Profile missing during check. Attempting JIT creation...");

            // 2. If not, upsert (Self-Healing)
            const newProfile = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                course: user.course || null,
                preferred_theme: user.preferred_theme,
                avatar_url: user.avatar_url || null
            };
            
            const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
            
            if (insertError) {
                 console.error("ensureProfile failed:", insertError);
            }
        } catch (err) {
            console.error("Error in ensureProfile:", err);
        }
    }, [user]);

    // Helper to get or create profile (Self-Healing)
    const getOrCreateProfile = async (authUser: SupabaseUser): Promise<User | null> => {
        try {
            // 1. Try to fetch existing profile
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (!fetchError && profile) {
                return profile as User;
            }

            // 2. If missing, try to create it (Self-Healing)
            console.warn("User profile missing/unreachable. Attempting to auto-repair...", fetchError?.message);
            
            const metadata = authUser.user_metadata || {};
            const newProfile = {
                id: authUser.id,
                email: authUser.email,
                full_name: metadata.full_name || authUser.email?.split('@')[0] || 'Unknown User',
                role: metadata.role || UserRole.STUDENT,
                course: metadata.course || null,
                preferred_theme: ThemePreference.SYSTEM,
                avatar_url: metadata.avatar_url || null
            };

            const { data: insertedProfile, error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();

            if (insertError) {
                console.error("Failed to auto-repair profile:", insertError);
                return createFallbackUser(authUser);
            }

            return insertedProfile as User;

        } catch (err) {
            console.error("Error in getOrCreateProfile:", err);
            return createFallbackUser(authUser);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // Set a failsafe timeout to clear loading state even if everything else hangs
            // This prevents infinite loading screens
            const globalTimeout = setTimeout(() => {
                if (mounted && loadingInitial) {
                    console.warn("Auth initialization timed out globally. Forcing load complete.");
                    setLoadingInitial(false);
                }
            }, 5000); 

            try {
                // 1. Get Session
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn("Error restoring session:", error.message);
                    // Handle "Refresh Token Not Found" or other refresh token errors
                    if (error.message.includes("Refresh Token Not Found") || error.message.includes("Invalid Refresh Token")) {
                        console.warn("Refresh token invalid. Clearing session to force re-login.");
                        await supabase.auth.signOut();
                        if (mounted) {
                            setUser(null);
                            setSession(null);
                        }
                    }
                }
                
                const initialSession = data?.session;
                if(mounted) setSession(initialSession);

                if (initialSession?.user) {
                    // 2. Get Profile with strict Timeout
                    // Create a promise that rejects after 4 seconds to prevent hanging
                    const profilePromise = getOrCreateProfile(initialSession.user);
                    const timeoutPromise = new Promise<User | null>((resolve) => 
                        setTimeout(() => resolve(null), 3000)
                    );

                    try {
                        // Race the profile fetch against the timeout
                        const profile = await Promise.race([
                            profilePromise,
                            timeoutPromise
                        ]);
                        
                        if (mounted) {
                            setUser(profile || createFallbackUser(initialSession.user));
                        }
                    } catch (err) {
                        console.warn("Profile fetch timed out or failed, using fallback.", err);
                        // If DB is slow/down, simply use the session data to log them in
                        if (mounted) setUser(createFallbackUser(initialSession.user));
                    }
                } else {
                    if (mounted) setUser(null);
                }
            } catch (err) {
                console.error("Auth init failed:", err);
            } finally {
                clearTimeout(globalTimeout);
                if (mounted) setLoadingInitial(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            // Update session state immediately
            setSession(session);
            
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoadingInitial(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    // If we don't have a user yet, or if the ID changed, fetch profile
                    if (!user || user.id !== session.user.id) {
                         // Use fallback immediately if loading is taking too long
                         getOrCreateProfile(session.user).then(profile => {
                             if (!mounted) return;
                             setUser(profile || createFallbackUser(session.user));
                             setLoadingInitial(false);
                         }).catch(() => {
                             if(mounted) {
                                 setUser(createFallbackUser(session.user));
                                 setLoadingInitial(false);
                             }
                         });
                    }
                } else {
                    setLoadingInitial(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (credentials: { email: string; password: string }) => {
        setLoading(true);
        setError(null);
        try {
            const { error, data } = await supabase.auth.signInWithPassword(credentials);
            if (error) throw error;
            
            if (data.user) {
                const profile = await getOrCreateProfile(data.user);
                setUser(profile || createFallbackUser(data.user));
            }
        } catch (e: any) {
            setError(getErrorMessage(e));
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (credentials: { email: string; password: string; role: UserRole; fullName: string; course: string }) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                options: {
                    data: {
                        full_name: credentials.fullName,
                        role: credentials.role,
                        course: credentials.course,
                        preferred_theme: ThemePreference.SYSTEM,
                    }
                }
            });
            
            if (error) throw error;
            if (!data.user) throw new Error("Sign up successful, but no user data returned.");

            if (data.user && !data.session) {
                throw new Error("ACCOUNT_CREATED_CHECK_EMAIL");
            }

            const profile = await getOrCreateProfile(data.user);
            setUser(profile || createFallbackUser(data.user));

        } catch (e: any) {
            const msg = getErrorMessage(e);
            if (e.message === "ACCOUNT_CREATED_CHECK_EMAIL") {
                setError("ACCOUNT_CREATED_CHECK_EMAIL");
            } else {
                setError(msg);
            }
            if (e.message !== "ACCOUNT_CREATED_CHECK_EMAIL") {
                 throw e;
            }
        } finally {
            setLoading(false);
        }
    };
    
    const signOut = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signOut();
            // If signOut fails (e.g., refresh token issue), we still want to clear local state.
            // We log the error but proceed to clear the user.
            if (error) console.error("Sign out error (proceeding to clear state):", error);
            
            setUser(null);
            setSession(null);
        } catch(e: any) {
            setError(getErrorMessage(e));
            // Even if exception, force clear.
            setUser(null);
            setSession(null);
        } finally {
            setLoading(false);
        }
    };

    const updateUserProfile = (updates: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updates });
        }
    };
    
    const updateUserAvatar = async (file: File) => {
        if (!user) throw new Error("User not logged in.");
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const newAvatarUrl = `${data.publicUrl}?t=${new Date().getTime()}`;

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', user.id);

        if (updateError) throw updateError;
        
        setUser({ ...user, avatar_url: newAvatarUrl });
    };
    
    const removeUserAvatar = async () => {
        if (!user || !user.avatar_url) return;
        
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id);

        if (updateError) throw updateError;
        
        setUser({ ...user, avatar_url: undefined });
    };

    const value: AuthContextType = {
        user,
        session,
        loadingInitial,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        updateUserProfile,
        updateUserAvatar,
        removeUserAvatar,
        ensureProfile,
        clearError: () => setError(null),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
