import React, { useState } from 'react';
import { User } from '../types';
import SideTray from './SideTray';
import { MenuIcon } from './icons';

interface DashboardLayoutProps {
    user: User;
    onLogout: () => void;
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, onLogout, children }) => {
    const [isSideTrayOpen, setIsSideTrayOpen] = useState(false);

    return (
        <div className="min-h-screen bg-primary-100 text-primary-700 font-sans flex">
            <SideTray 
                user={user} 
                onLogout={onLogout} 
                isOpen={isSideTrayOpen}
                setIsOpen={setIsSideTrayOpen}
            />
            <div className="flex-1 flex flex-col transition-all duration-300 lg:ml-64">
                <header className="lg:hidden p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm border-b border-primary-200 sticky top-0 z-10">
                    <span className="font-bold text-lg text-primary-600">CardZap</span>
                    <button onClick={() => setIsSideTrayOpen(true)}>
                        <MenuIcon className="h-6 w-6 text-primary-600" />
                    </button>
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
