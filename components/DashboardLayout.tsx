import React, { useState, useRef, useEffect } from 'react';
import { AppState, User } from '../types';
import SideTray from './SideTray';
import { MenuIcon, UserIcon, LogoutIcon } from './icons';

interface DashboardLayoutProps {
    user: User;
    onLogout: () => void;
    children: React.ReactNode;
    activePage: AppState;
    onNavigate: (page: AppState) => void;
}

const UserMenu: React.FC<{ user: User; onLogout: () => void; onNavigate: (page: AppState) => void; }> = ({ user, onLogout, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNavigate = (page: AppState) => {
        onNavigate(page);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-left p-1 rounded-full hover:bg-primary-200/50 transition-colors">
                 <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                </div>
                <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-primary-700 truncate max-w-[150px]">{user.full_name}</p>
                </div>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-primary-200 animate-[fade-in_0.1s_ease-out]">
                     <style>{`
                        @keyframes fade-in {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div className="p-4 border-b border-primary-200">
                        <p className="text-sm font-semibold text-primary-700 truncate">{user.full_name}</p>
                        <p className="text-xs text-primary-500 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                        <button onClick={() => handleNavigate(AppState.PROFILE)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-primary-700 hover:bg-primary-100">
                           <UserIcon className="w-5 h-5" />
                           <span>Profile</span>
                        </button>
                        <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-primary-700 hover:bg-primary-100">
                            <LogoutIcon className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout, children, activePage, onNavigate }) => {
    const [isSideTrayOpen, setIsSideTrayOpen] = useState(false);

    return (
        <div className="min-h-screen bg-primary-100 text-primary-700 font-sans flex">
            <SideTray 
                user={user} 
                onLogout={onLogout} 
                isOpen={isSideTrayOpen}
                setIsOpen={setIsSideTrayOpen}
                activePage={activePage}
                onNavigate={onNavigate}
            />
            <div className="flex-1 flex flex-col transition-all duration-300 lg:ml-64">
                <header className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm border-b border-primary-200 sticky top-0 z-10">
                    <button onClick={() => setIsSideTrayOpen(true)} className="lg:hidden text-primary-600">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-primary-700 capitalize">
                           {activePage.replace(/_/g, ' ').toLowerCase()}
                        </h1>
                    </div>
                    
                    <UserMenu user={user} onLogout={onLogout} onNavigate={onNavigate} />
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;