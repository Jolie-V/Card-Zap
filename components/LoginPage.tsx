import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { CardZapLogo } from './icons';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // This is a mock login. In a real app, you'd validate credentials.
        if (email) {
            onLogin({ email, role });
        } else {
            alert("Please enter an email to log in.");
        }
    };

    return (
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl max-w-md w-full transition-all duration-300 border border-primary-200 animate-[fade-in_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <div className="text-center mb-8">
                <div className="inline-block">
                    <CardZapLogo className="h-16 w-auto" />
                </div>
                <h1 className="text-3xl font-extrabold text-primary-700 mt-4">
                    Welcome to CardZap
                </h1>
                <p className="text-primary-500">Sign in to continue</p>
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
                    />
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-primary-600 mb-2">I am a...</label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full bg-primary-100 border border-primary-300 rounded-md px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                        {Object.values(UserRole).map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="w-full text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 text-white rounded-lg py-3 px-6 transition-all hover:from-primary-500 hover:to-primary-700 disabled:opacity-50">
                    Sign In
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
