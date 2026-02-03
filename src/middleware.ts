import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

/**
 * Role to dashboard path mapping
 * Extensible: Add new roles here when needed
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    FACULTY: "/dashboard/faculty",
    STUDENT: "/dashboard/student",
};

/**
 * Dashboard path to required role mapping
 */
const DASHBOARD_ROLE_MAP: Record<string, string> = {
    "/dashboard/admin": "ADMIN",
    "/dashboard/faculty": "FACULTY",
    "/dashboard/student": "STUDENT",
};

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/login", "/signup", "/api/auth", "/"];

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(
        (route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`))
    );
}

/**
 * Check if a path is a dashboard route
 */
function isDashboardRoute(pathname: string): boolean {
    return pathname.startsWith("/dashboard");
}

/**
 * Get the required role for a dashboard path
 */
function getRequiredRole(pathname: string): string | null {
    for (const [path, role] of Object.entries(DASHBOARD_ROLE_MAP)) {
        if (pathname === path || pathname.startsWith(`${path}/`)) {
            return role;
        }
    }
    return null;
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Get the token using getToken from next-auth/jwt
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    const isAuthenticated = !!token;
    const userRole = token?.role as string | undefined;

    // Protect admin API routes
    if (pathname.startsWith("/api/admin")) {
        if (!isAuthenticated) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (userRole !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.next();
    }

    // Allow public routes
    if (isPublicRoute(pathname)) {
        // Redirect authenticated users away from login/signup pages to their dashboard
        if ((pathname === "/login" || pathname === "/signup") && isAuthenticated && userRole) {
            const dashboardPath = ROLE_DASHBOARD_MAP[userRole];
            if (dashboardPath) {
                return NextResponse.redirect(new URL(dashboardPath, req.url));
            }
        }
        return NextResponse.next();
    }

    // Protect dashboard routes
    if (isDashboardRoute(pathname)) {
        // Redirect unauthenticated users to login
        if (!isAuthenticated) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Handle /dashboard base path - redirect to role-specific dashboard
        if (pathname === "/dashboard" && userRole) {
            const dashboardPath = ROLE_DASHBOARD_MAP[userRole];
            if (dashboardPath) {
                return NextResponse.redirect(new URL(dashboardPath, req.url));
            }
        }

        // Check role-based access
        const requiredRole = getRequiredRole(pathname);
        if (requiredRole && userRole !== requiredRole) {
            // User is trying to access a dashboard they don't have permission for
            // Redirect them to their own dashboard
            const correctDashboard = ROLE_DASHBOARD_MAP[userRole as string];
            if (correctDashboard) {
                return NextResponse.redirect(new URL(correctDashboard, req.url));
            }
        }
    }

    // For any other protected routes, require authentication
    if (!isAuthenticated && !isPublicRoute(pathname)) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
