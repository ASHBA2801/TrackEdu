import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail } from "./db";
import { verifyPassword } from "./bcrypt";
import type { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                const user = await getUserByEmail(email);

                if (!user) {
                    throw new Error("Invalid email or password");
                }

                if (!user.isActive) {
                    throw new Error("Account is inactive");
                }

                if (!user.password) {
                    throw new Error("Account not set up for password login");
                }

                const isValid = await verifyPassword(password, user.password);

                if (!isValid) {
                    throw new Error("Invalid email or password");
                }

                return {
                    id: user.id,
                    name: user.name ?? "",
                    email: user.email,
                    role: user.role,
                    isPasswordChangeRequired: user.isPasswordChangeRequired,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role as UserRole;
                token.isPasswordChangeRequired = user.isPasswordChangeRequired;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.isPasswordChangeRequired = token.isPasswordChangeRequired;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: "/login",
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

/**
 * Role to dashboard path mapping
 * Extensible: Add new roles here as needed
 */
export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
    ADMIN: "/dashboard/admin",
    FACULTY: "/dashboard/faculty",
    STUDENT: "/dashboard/student",
    HOD: "/dashboard/hod",
};

/**
 * Get the dashboard path for a given role
 */
export function getDashboardPath(role: UserRole): string {
    return ROLE_DASHBOARD_MAP[role] || "/login";
}

