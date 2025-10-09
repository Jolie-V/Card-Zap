
import React, { useState, useEffect } from 'react';
import { Lobby, LobbyMember } from '../types';
import { ProfileAvatar } from './icons';

interface CoopGamePageProps {
    lobby: Lobby;
    members: LobbyMember[];
    onLeaveGame: () => void;
}

const CoopGamePage: React.FC<CoopGamePageProps> = ({ lobby, members, onLeaveGame }) => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const sortedMembers = [...members].sort((a, b) => b.score - a.score);

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-8 p-4 animate-[fade-in_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
            {/* Main Game Area */}
            <div className="flex-1 flex flex-col">
                <header className="bg-white p-4 rounded-t-2xl shadow-lg border-b border-primary-200 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-primary-700">Co-op Quiz</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-white bg-primary-500 px-4 py-1 rounded-lg shadow-inner">
                            {formatTime(timeLeft)}
                        </div>
                        <button onClick={onLeaveGame} className="font-semibold bg-red-100 text-red-700 rounded-md py-2 px-4 hover:bg-red-200">
                            Leave Game
                        </button>
                    </div>
                </header>
                <main className="flex-1 bg-white p-8 rounded-b-2xl shadow-xl flex items-center justify-center">
                     <div className="text-center p-12 bg-primary-100 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">Game Area</p>
                        <p className="text-primary-500 mt-2">The quiz card will be displayed here.</p>
                    </div>
                </main>
            </div>

            {/* Leaderboard */}
            <aside className="w-full md:w-80 bg-white p-6 rounded-2xl shadow-xl border border-primary-200">
                <h2 className="text-2xl font-bold text-primary-700 mb-4 text-center">Leaderboard</h2>
                <ul className="space-y-4">
                    {sortedMembers.map((member, index) => (
                        <li key={member.user_id} className={`flex items-center gap-4 p-3 rounded-lg transition-all ${index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-primary-100'}`}>
                            <span className="text-xl font-bold text-primary-400 w-6 text-center">{index + 1}</span>
                            <ProfileAvatar className="w-10 h-10" />
                            <div className="flex-1">
                                <p className="font-semibold text-primary-700 truncate">{member.profile.full_name || 'A Student'}</p>
                            </div>
                            <p className="text-lg font-bold text-primary-600">{member.score}</p>
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
};

export default CoopGamePage;
