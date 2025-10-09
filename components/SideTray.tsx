


import React from 'react';
import { User, UserRole, AppState } from '../types';
import { CardZapLogo, DashboardIcon, CardsIcon, LogoutIcon, CloseIcon, UserGroupIcon, AcademicCapIcon, BookOpenIcon, UserIcon } from './icons';

interface SideTrayProps {
    user: User;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    activePage: AppState;
    onNavigate: (page: AppState) => void;
}

const SideTray: React.FC<SideTrayProps> = ({ user, onLogout, isOpen, setIsOpen, activePage, onNavigate }) => {
    
    const adminNavItems = [
        { label: 'Dashboard', icon: DashboardIcon, page: AppState.ADMIN_DASHBOARD },
        { label: 'Students', icon: UserGroupIcon, page: null },
        { label: 'Teachers', icon: AcademicCapIcon, page: null },
        { label: 'Subjects', icon: BookOpenIcon, page: null },
    ];

    const studentNavItems = [
        { label: 'Your Decks', icon: CardsIcon, page: AppState.YOUR_CARDS },
        { label: 'Your Subjects', icon: BookOpenIcon, page: AppState.STUDENT_SUBJECTS },
        { label: 'Profile', icon: UserIcon, page: AppState.PROFILE },
        { label: 'Your Friends', icon: UserGroupIcon, page: AppState.YOUR_FRIENDS },
    ];

    const teacherNavItems = [
        { label: 'Your Decks', icon: CardsIcon, page: AppState.YOUR_CARDS },
        { label: 'Your Subjects', icon: BookOpenIcon, page: AppState.SUBJECTS },
        { label: 'Profile', icon: UserIcon, page: AppState.PROFILE },
    ];
    
    let navItems;
    if (user.role === UserRole.ADMIN) {
        navItems = adminNavItems;
    } else if (user.role === UserRole.TEACHER) {
        navItems = teacherNavItems;
    } else { // Student
        navItems = studentNavItems;
    }
    
    const handleNavigate = (page: AppState | null) => {
        if (page) {
            onNavigate(page);
            setIsOpen(false);
        }
    };

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
                    {navItems.map(item => {
                        const commonClasses = "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-left transition-colors";
                        if (item.page === null) {
                            return (
                                <div key={item.label} className={`${commonClasses} text-primary-400 cursor-not-allowed opacity-60`}>
                                  <item.icon className="h-6 w-6" />
                                  <span>{item.label}</span>
                                  <span className="text-xs font-normal bg-primary-200 text-primary-500 px-2 py-0.5 rounded-full ml-auto">Soon</span>
                                </div>
                            );
                        }
                        
                        const isActive = activePage === item.page;
                        
                        return (
                          <button 
                            key={item.label}
                            onClick={() => handleNavigate(item.page)}
                            className={`${commonClasses} ${isActive ? 'bg-primary-500 text-white' : 'text-primary-600 hover:bg-primary-100'}`}
                           >
                            <item.icon className="h-6 w-6" />
                            <span>{item.label}</span>
                          </button>
                        )
                    })}
                </nav>
                <div className="p-4 border-t border-primary-200">
                     <div className="mb-4 p-3 rounded-lg bg-primary-100">
                        <p className="text-sm font-semibold text-primary-700 truncate">{user.full_name}</p>
                        <p className="text-xs text-primary-500 truncate">{user.email}</p>
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