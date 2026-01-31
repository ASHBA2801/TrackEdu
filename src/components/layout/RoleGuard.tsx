'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/' }: RoleGuardProps) {
    const { role, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace(redirectTo);
            return;
        }

        if (role && !allowedRoles.includes(role)) {
            // Redirect to appropriate dashboard based on role
            const dashboardRoutes: Record<UserRole, string> = {
                student: '/student/dashboard',
                faculty: '/faculty/dashboard',
                admin: '/admin/dashboard',
            };
            router.replace(dashboardRoutes[role] || redirectTo);
        }
    }, [isAuthenticated, role, allowedRoles, router, redirectTo]);

    // Show nothing while checking auth
    if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}
