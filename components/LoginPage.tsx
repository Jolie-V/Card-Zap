

import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { CardZapLogo, RefreshIcon } from './icons';
import { getErrorMessage } from '../utils';

interface LoginPageProps {
    onSignIn: (credentials: {email: string, password: string}) => Promise<void>;
    onSignUp: (credentials: {email: string, password: string, role: UserRole, fullName: string, course: string}) => Promise<void>;
    onContinueAsGuest: () => void;
    error: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSignIn, onSignUp, onContinueAsGuest, error: propError }) => {
    const [isSignIn, setIsSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [course, setCourse] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(propError);
    const isConnectionError = propError?.includes('authentication service is not responding');
    const isSchemaError = error?.startsWith('SCHEMA_CACHE_ERROR:');
    const errorMessage = error?.replace('SCHEMA_CACHE_ERROR:', '');

    useEffect(() => {
        setError(propError);
    }, [propError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isSignIn) {
                await onSignIn({ email, password });
            } else {
                if (!fullName.trim()) {
                    setError('Full name is required.');
                    setLoading(false);
                    return;
                }
                await onSignUp({ email, password, role, fullName, course });
                // After successful sign up, the onAuthStateChange listener will handle the redirect.
                // We just need to wait.
                setPassword(''); // Clear password for security
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    
    const toggleMode = () => {
        setIsSignIn(!isSignIn);
        setError(null);
    }

    return (
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl max-w-md w-full transition-all duration-300 border border-primary-200 animate-[fade-in_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <div className="text-center mb-6">
                <div className="inline-block h-[164px] overflow-hidden">
                    <CardZapLogo className="h-[164px] w-auto mt-[-25px]" />
                </div>
                <h1 className="text-3xl font-extrabold text-primary-700 mt-[-34px]">
                    {isSignIn ? 'Welcome Back!' : 'Create an Account'}
                </h1>
                <p className="text-primary-500">{isSignIn ? 'Sign in to continue to CardZap' : 'Get started with AI-powered flashcards'}</p>
            </div>
            
            {error && (
                isSchemaError ? (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                        <p className="font-bold">Database Out of Sync</p>
                        <p className="text-sm mt-1">{errorMessage}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-3 flex items-center gap-2 text-sm font-semibold bg-yellow-200 text-yellow-800 rounded px-3 py-1.5 hover:bg-yellow-300"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Refresh Page to Sync
                        </button>
                    </div>
                ) : isConnectionError ? (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                        <p className="font-bold">Connection Issue</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
                    </div>
                ) : (
                    <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-6 whitespace-pre-wrap" role="alert">{error}</div>
                )
            )}
            
             <div className="flex border-b-2 border-primary-200 mb-6">
                <button 
                    onClick={() => { if(!isSignIn) toggleMode() }}
                    className={`w-1/2 py-3 text-center font-semibold transition-all duration-300 ${isSignIn ? 'text-primary-500 border-b-2 border-primary-500' : 'text-primary-400 hover:bg-primary-100'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => { if(isSignIn) toggleMode() }}
                    className={`w-1/2 py-3 text-center font-semibold transition-all duration-300 ${!isSignIn ? 'text-primary-500 border-b-2 border-primary-500' : 'text-primary-400 hover:bg-primary-100'}`}
                >
                    Sign Up
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary-600 mb-2">Email Address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                        disabled={loading}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-primary-600 mb-2">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                        disabled={loading}
                    />
                </div>
                
                {!isSignIn && (
                    <>
                        <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-primary-600 mb-2">Full Name</label>
                            <input
                                id="full-name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="course" className="block text-sm font-medium text-primary-600 mb-2">Course (Optional)</label>
                            <input
                                id="course"
                                type="text"
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                placeholder="e.g. Computer Science"
                                className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                disabled={loading}
                            />
                        </div>
                    </>
                )}

                {!isSignIn && (
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-primary-600 mb-2">I am a...</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            disabled={loading}
                        >
                            {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button type="submit" className="w-full text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={loading}>
                    {loading ? (isSignIn ? 'Signing In...' : 'Creating Account...') : (isSignIn ? 'Sign In' : 'Create Account')}
                </button>
            </form>
            
            <div className="mt-6 text-center">
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-primary-200"></div>
                    <span className="flex-shrink mx-4 text-sm text-primary-400">OR</span>
                    <div className="flex-grow border-t border-primary-200"></div>
                </div>
                <button 
                    onClick={onContinueAsGuest}
                    className={`font-semibold transition-all duration-300 disabled:opacity-50 ${
                        isConnectionError 
                        ? 'w-full text-lg bg-primary-500 text-white rounded-lg py-3 px-6 hover:bg-primary-600'
                        : 'text-primary-500 hover:text-primary-700'
                    }`}
                    disabled={loading}
                >
                    {isConnectionError ? 'Use App as Guest' : 'Continue as Guest'}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
