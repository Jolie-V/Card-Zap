
import React, { useMemo } from 'react';
import { Lobby, LobbyMember, LobbyMemberStatus, User } from '../types';
import { ProfileAvatar } from './icons';

interface CoopLobbyPageProps {
    user: User;
    lobby: Lobby;
    members: LobbyMember[];
    onLeaveLobby: () => void;
    onStartGame: () => void;
}

const CoopLobbyPage: React.FC<CoopLobbyPageProps> = ({ user, lobby, members, onLeaveLobby, onStartGame }) => {
    const isHost = user.id === lobby.host_id;

    const joinedMembers = useMemo(() => {
        return members.filter(m => m.status === LobbyMemberStatus.JOINED).sort((a, b) => {
            if (a.user_id === lobby.host_id) return -1;
            if (b.user_id === lobby.host_id) return 1;
            return 0;
        });
    }, [members, lobby.host_id]);

    const invitedMembers = useMemo(() => {
        return members.filter(m => m.status === LobbyMemberStatus.INVITED);
    }, [members]);

    return (
        <div className="w-full max-w-4xl mx-auto animate-[fade-in-up_0.5s_ease-out]">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
                    Co-op Study Lobby
                </h1>
                <p className="text-primary-500">Get ready to learn together!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Panel: Players */}
                <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-primary-200">
                    <h2 className="text-2xl font-bold text-primary-700 mb-4">Players ({joinedMembers.length}/4)</h2>
                    <ul className="space-y-4">
                        {joinedMembers.map(member => (
                            <li key={member.user_id} className="flex items-center gap-4 p-3 bg-primary-100 rounded-lg">
                                <ProfileAvatar className="w-10 h-10" />
                                <div>
                                    <p className="font-semibold text-primary-700">{member.profile.full_name || 'A Student'}</p>
                                    {member.user_id === lobby.host_id && <p className="text-xs text-primary-500 font-bold">HOST</p>}
                                </div>
                            </li>
                        ))}
                        {invitedMembers.map(member => (
                             <li key={member.user_id} className="flex items-center gap-4 p-3 bg-primary-100/50 rounded-lg opacity-60">
                                <ProfileAvatar className="w-10 h-10" />
                                <div>
                                    <p className="font-semibold text-primary-600">{member.profile.full_name || 'A Student'}</p>
                                    <p className="text-xs text-primary-500 font-bold">INVITED...</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Panel: Game Setup */}
                <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-xl border border-primary-200 flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-primary-700 mb-4">Game Setup</h2>
                        {isHost ? (
                             <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-600 mb-2">1. Invite More Friends (Optional)</h3>
                                    <button disabled={members.length >= 4} className="w-full font-semibold bg-primary-200 text-primary-600 rounded-md py-2 px-4 transition-colors hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {members.length >= 4 ? 'Lobby is Full' : 'Invite from Friends List'}
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-primary-600 mb-2">2. Upload Study Material</h3>
                                    <p className="text-sm text-primary-500 mb-2">Upload a .txt, .pdf, or .docx file. The system will generate flashcards from it for the game.</p>
                                    <input type="file" className="w-full text-sm text-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"/>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-12 bg-primary-100 rounded-lg">
                                <p className="text-lg text-primary-600">Waiting for the host to set up the game and upload the study materials.</p>
                            </div>
                        )}
                    </div>

                     <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <button onClick={onLeaveLobby} className="w-full sm:w-auto text-lg font-bold bg-primary-200 text-primary-600 rounded-lg py-3 px-6 transition-all hover:bg-primary-300/80">
                            Leave Lobby
                        </button>
                        {isHost && (
                             <button onClick={onStartGame} className="w-full sm:flex-1 text-lg font-bold bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg py-3 px-6 transition-all hover:from-green-500 hover:to-green-700 disabled:opacity-50">
                                Start Game
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoopLobbyPage;
