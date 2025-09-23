import React from 'react';
import { User, UserRole } from '../types';
import { CardZapLogo, DashboardIcon, CardsIcon, LogoutIcon, CloseIcon, UserGroupIcon, AcademicCapIcon, BookOpenIcon } from './icons';

interface SideTrayProps {
    user: User;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const SideTray: React.FC<SideTrayProps> = ({ user, onLogout, isOpen, setIsOpen }) => {
    
    const adminNavItems = [
        { label: 'Dashboard', icon: DashboardIcon, active: true },
        { label: 'Students', icon: UserGroupIcon, active: false },
        { label: 'Teachers', icon: AcademicCapIcon, active: false },
        { label: 'Subjects', icon: BookOpenIcon, active: false },
    ];

    const studentTeacherNavItems = [
        { label: 'Your Decks', icon: CardsIcon, active: true },
    ];
    
    const navItems = user.role === UserRole.ADMIN ? adminNavItems : studentTeacherNavItems;


    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>

            <aside className={`fixed top-0 left-0 h-full bg-white border-r border-primary-200 w-64 flex flex-col z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex items-center justify-between p-4 border-b border-primary-200">
                    <div className="flex items-center gap-2">
                         <CardZapLogo className="h-10 w-auto" />
                        <span className="font-bold text-xl text-primary-600">CardZap</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden">
                        <CloseIcon className="h-6 w-6 text-primary-500"/>
                    </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map(item => (
                        <a key={item.label} href="#" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold transition-colors ${item.active ? 'bg-primary-500 text-white' : 'text-primary-600 hover:bg-primary-100'}`}>
                            <item.icon className="h-6 w-6" />
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="p-4 border-t border-primary-200">
                     <div className="mb-4 p-3 rounded-lg bg-primary-100">
                        <p className="text-sm font-semibold text-primary-700 truncate">{user.email}</p>
                        <p className="text-xs text-primary-500">{user.role}</p>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-primary-600 hover:bg-primary-100 transition-colors">
                        <LogoutIcon className="h-6 w-6" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SideTray;