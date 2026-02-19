

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { CardZapLogo, DashboardIcon, CardsIcon, LogoutIcon, CloseIcon, UserGroupIcon, AcademicCapIcon, BookOpenIcon, UserIcon, CogIcon } from './icons';
import { useAuth } from './AuthProvider';

interface SideTrayProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const SideTray: React.FC<SideTrayProps> = ({ isOpen, setIsOpen }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) {
        return null;
    }

    const adminNavItems = [
        { label: 'Dashboard', icon: DashboardIcon, path: '/admin' },
        { label: 'Students', icon: UserGroupIcon, path: '/admin/students' },
        { label: 'Teachers', icon: AcademicCapIcon, path: '/admin/teachers' },
        { label: 'Subjects', icon: BookOpenIcon, path: '/admin/subjects' },
    ];

    const studentNavItems = [
        { label: 'Your Cards', icon: CardsIcon, path: '/your-cards' },
        { label: 'Your Subjects', icon: BookOpenIcon, path: '/your-subjects' },
        { label: 'Friends', icon: UserGroupIcon, path: '/friends' },
        { label: 'Profile', icon: UserIcon, path: '/profile' },
        { label: 'Settings', icon: CogIcon, path: '/settings' },
    ];

    const teacherNavItems = [
        { label: 'Your Cards', icon: CardsIcon, path: '/your-cards' },
        { label: 'Your Subjects', icon: BookOpenIcon, path: '/subjects' },
        { label: 'Profile', icon: UserIcon, path: '/profile' },
        { label: 'Settings', icon: CogIcon, path: '/settings' },
    ];
    
    let navItems;
    if (user.role === UserRole.ADMIN) {
        navItems = adminNavItems;
    } else if (user.role === UserRole.TEACHER) {
        navItems = teacherNavItems;
    } else { // Student
        navItems = studentNavItems;
    }
    
    const handleNavigate = (path: string | null) => {
        if (path) {
            navigate(path);
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

            <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-primary-200 dark:border-gray-700 w-64 flex flex-col z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                         <CardZapLogo className="h-10 w-auto" />
                        <span className="font-bold text-xl text-primary-600 dark:text-primary-300">CardZap</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden">
                        <CloseIcon className="h-6 w-6 text-primary-500 dark:text-gray-400"/>
                    </button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map(item => {
                        const commonClasses = "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-left transition-colors";
                        if (item.path === null) {
                            return (
                                <div key={item.label} className={`${commonClasses} text-primary-400 cursor-not-allowed opacity-60`}>
                                  <item.icon className="h-6 w-6" />
                                  <span>{item.label}</span>
                                  <span className="text-xs font-normal bg-primary-200 text-primary-500 px-2 py-0.5 rounded-full ml-auto">Soon</span>
                                </div>
                            );
                        }
                        
                        const isActive = location.pathname === item.path;
                        
                        return (
                          <button 
                            key={item.label}
                            onClick={() => handleNavigate(item.path)}
                            className={`${commonClasses} ${isActive ? 'bg-primary-500 text-white' : 'text-primary-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-700'}`}
                           >
                            <item.icon className="h-6 w-6" />
                            <span>{item.label}</span>
                          </button>
                        )
                    })}
                </nav>
                <div className="p-4 border-t border-primary-200 dark:border-gray-700">
                     <div className="mb-4 p-3 rounded-lg bg-primary-100 dark:bg-gray-700">
                        <p className="text-sm font-semibold text-primary-700 dark:text-gray-100 truncate">{user.full_name}</p>
                        <p className="text-xs text-primary-500 dark:text-gray-400 truncate">{user.email}</p>
                        <p className="text-xs text-primary-500 dark:text-gray-400">{user.role}</p>
                    </div>
                    <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-primary-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors">
                        <LogoutIcon className="h-6 w-6" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SideTray;
