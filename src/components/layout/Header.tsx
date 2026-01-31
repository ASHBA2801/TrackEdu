'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface HeaderProps {
    title?: string;
    showRoleBadge?: boolean;
}

export function Header({ title, showRoleBadge = true }: HeaderProps) {
    const { user, role, logout, isAuthenticated } = useAuth();

    const roleColors: Record<UserRole, string> = {
        student: 'bg-green-100 text-green-700',
        faculty: 'bg-blue-100 text-blue-700',
        admin: 'bg-purple-100 text-purple-700',
    };

    const roleLabels: Record<UserRole, string> = {
        student: 'Student',
        faculty: 'Faculty',
        admin: 'Admin',
    };

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
                        AttendTrack
                    </Link>
                    {title && (
                        <>
                            <span className="text-gray-300">/</span>
                            <h1 className="text-lg font-semibold text-gray-600">{title}</h1>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated && user && (
                        <>
                            {showRoleBadge && role && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[role]}`}>
                                    {roleLabels[role]}
                                </span>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </>
                    )}

                    {!isAuthenticated && (
                        <Link
                            href="/"
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
