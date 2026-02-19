
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { CardZapLogo, RefreshIcon, EyeIcon, CheckCircleIcon } from './icons';
import { getErrorMessage } from '../utils';
import { useAuth } from './AuthProvider';

type Mode = 'signIn' | 'signUp';

const LoginPage: React.FC = () => {
    const { signIn, signUp, error: authError, loading, clearError } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [course, setCourse] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
    const [error, setError] = useState<string | null>(authError);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check for generic connection error
    const isConnectionError = authError?.includes('authentication service is not responding') || authError?.includes('Unable to connect to the server');
    
    useEffect(() => {
        if (authError === "ACCOUNT_CREATED_CHECK_EMAIL") {
            setSuccessMessage("Account created successfully! Please check your email to verify your account before logging in.");
            setError(null);
            setMode('signIn'); // Switch back to sign in
        } else {
            setError(authError);
            setSuccessMessage(null);
        }
    }, [authError]);
    
    useEffect(() => {
        // Clear password and errors when switching modes
        setPassword('');
        setError(null);
        setSuccessMessage(null);
        clearError();
    }, [mode, clearError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        try {
            if (mode === 'signIn') {
                await signIn({ email, password });
            } else if (mode === 'signUp') {
                if (!fullName.trim()) {
                    setError('Full name is required.');
                    return;
                }
                await signUp({ email, password, role, fullName, course });
            }
        } catch (err) {
            // Error is handled via AuthContext state, but we catch it here to prevent unhandled promise rejections
        }
    };
    
    const handleSetMode = (newMode: Mode) => {
        setMode(newMode);
    };

    const onContinueAsGuest = () => {
        navigate('/guest/create');
    }
    
    const pageTitles = {
        signIn: 'Welcome Back!',
        signUp: 'Create an Account',
    };
    
    const pageSubtitles = {
        signIn: 'Sign in to continue to CardZap',
        signUp: 'Get started with AI-powered flashcards',
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-10 rounded-2xl shadow-xl max-w-md w-full transition-all duration-300 border border-primary-200 dark:border-gray-700 animate-[fade-in_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <div className="text-center mb-6">
                <div className="inline-block h-28 sm:h-32 overflow-hidden">
                    <CardZapLogo className="h-full w-auto mt-[-15px] sm:mt-[-20px]" />
                </div>
                <h1 className="text-3xl font-extrabold text-primary-700 dark:text-gray-200 mt-[-20px] sm:mt-[-24px]">
                    {pageTitles[mode]}
                </h1>
                <p className="text-primary-500 dark:text-gray-300">{pageSubtitles[mode]}</p>
            </div>
            
            {successMessage && (
                <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-800 dark:text-green-300 p-4 mb-6 rounded-r-lg" role="alert">
                    <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-semibold">{successMessage}</p>
                    </div>
                </div>
            )}

            {error && (
                isConnectionError ? (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 p-4 mb-6 rounded-r-lg" role="alert">
                        <p className="font-bold">Connection Issue</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
                    </div>
                ) : (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6 whitespace-pre-wrap" role="alert">{error}</div>
                )
            )}
            
             <div className="flex border-b-2 border-primary-200 dark:border-gray-600 mb-6">
                <button 
                    onClick={() => handleSetMode('signIn')}
                    className={`w-1/2 py-3 text-center font-semibold transition-all duration-300 ${mode === 'signIn' ? 'text-primary-500 dark:text-primary-300 border-b-2 border-primary-500 dark:border-primary-400' : 'text-primary-400 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-gray-700'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => handleSetMode('signUp')}
                    className={`w-1/2 py-3 text-center font-semibold transition-all duration-300 ${mode === 'signUp' ? 'text-primary-500 dark:text-primary-300 border-b-2 border-primary-500 dark:border-primary-400' : 'text-primary-400 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-gray-700'}`}
                >
                    Sign Up
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Email Address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                        disabled={loading}
                    />
                </div>

                {(mode === 'signIn' || mode === 'signUp') && (
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 pr-10 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-primary-500 dark:text-gray-400 hover:text-primary-700 dark:hover:text-gray-200"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                <EyeIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
                
                {mode === 'signUp' && (
                    <>
                        <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Full Name</label>
                            <input
                                id="full-name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Jose Cruz"
                                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="course" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">Course (Optional)</label>
                            <input
                                id="course"
                                type="text"
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                placeholder="e.g. Computer Science"
                                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-primary-600 dark:text-gray-300 mb-2">I am a...</label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full bg-primary-100 dark:bg-gray-700 border border-primary-300 dark:border-gray-600 rounded-md px-4 py-2 text-primary-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                disabled={loading}
                            >
                                {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <button type="submit" className="w-full text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50" disabled={loading}>
                    {loading ? 'Processing...' :
                     mode === 'signIn' ? 'Sign In' : 'Create Account'}
                </button>
            </form>
            
            {(mode === 'signIn' || mode === 'signUp') && (
                <div className="mt-6 text-center">
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-primary-200 dark:border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-sm text-primary-400 dark:text-gray-500">OR</span>
                        <div className="flex-grow border-t border-primary-200 dark:border-gray-600"></div>
                    </div>
                    <button 
                        onClick={onContinueAsGuest}
                        className={`font-semibold transition-all duration-300 disabled:opacity-50 ${
                            isConnectionError 
                            ? 'w-full text-lg bg-primary-500 text-white rounded-lg py-3 px-6 hover:bg-primary-600'
                            : 'text-primary-500 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200'
                        }`}
                        disabled={loading}
                    >
                        {isConnectionError ? 'Use App as Guest' : 'Continue as Guest'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LoginPage;