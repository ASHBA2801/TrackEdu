'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { users, students, faculty, getStudentById, getFacultyById, getDepartmentById } from '@/lib/mock-data';

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    login: (role: UserRole) => void;
    logout: () => void;
    isAuthenticated: boolean;
    getUserDetails: () => {
        name: string;
        email: string;
        department?: string;
        details?: Record<string, unknown>;
    } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    const login = (role: UserRole) => {
        // Find a mock user with the given role
        const mockUser = users.find(u => u.role === role);
        if (mockUser) {
            setUser(mockUser);
        }
    };

    const logout = () => {
        setUser(null);
    };

    const getUserDetails = () => {
        if (!user) return null;

        let details: Record<string, unknown> = {};
        let department = '';

        if (user.role === 'student') {
            const student = getStudentById(user.roleId);
            if (student) {
                const dept = getDepartmentById(student.departmentId);
                department = dept?.name || '';
                details = {
                    rollNumber: student.rollNumber,
                    year: student.year,
                    section: student.section,
                };
            }
        } else if (user.role === 'faculty') {
            const fac = getFacultyById(user.roleId);
            if (fac) {
                const dept = getDepartmentById(fac.departmentId);
                department = dept?.name || '';
                details = {
                    assignedSubjects: fac.assignedSubjects,
                };
            }
        }

        return {
            name: user.name,
            email: user.email,
            department,
            details,
        };
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                role: user?.role || null,
                login,
                logout,
                isAuthenticated: !!user,
                getUserDetails,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
