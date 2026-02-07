'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { UserRole } from '@prisma/client';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/login' }: RoleGuardProps) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const isLoading = status === 'loading';
    const isAuthenticated = status === 'authenticated';
    const userRole = session?.user?.role;

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace(redirectTo);
            return;
        }

        if (userRole && !allowedRoles.includes(userRole)) {
            // Redirect to appropriate dashboard based on role
            const dashboardRoutes: Record<UserRole, string> = {
                STUDENT: '/dashboard/student',
                FACULTY: '/dashboard/faculty',
                ADMIN: '/dashboard/admin',
                HOD: '/dashboard/hod',
            };
            router.replace(dashboardRoutes[userRole] || redirectTo);
        }
    }, [isLoading, isAuthenticated, userRole, allowedRoles, router, redirectTo]);

    // Show loading spinner while checking auth
    if (isLoading || !isAuthenticated || !userRole || !allowedRoles.includes(userRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}

