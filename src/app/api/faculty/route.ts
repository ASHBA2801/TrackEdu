import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSecurePassword } from "@/lib/utils/password";
import { hashPassword } from "@/lib/bcrypt";

// GET /api/faculty - Get all faculty
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const departmentId = searchParams.get("departmentId");
        const activeOnly = searchParams.get("activeOnly") === "true";

        const where: any = { isDeleted: false };

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (activeOnly) {
            where.isActive = true;
        }

        const facultyList = await prisma.faculty.findMany({
            where,
            include: {
                department: true,
                user: true,
                subjects: true
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const facultyWithDetails = facultyList.map(fac => ({
            ...fac,
            name: fac.user.name,
            email: fac.user.email,
            departmentName: fac.department?.name || "Unknown",
            // subjects is already array of Subject objects
            assignedSubjects: fac.subjects.map(s => s.id) // For backward compatibility if needed, or just use subjects
        }));

        return NextResponse.json({
            success: true,
            data: facultyWithDetails,
            total: facultyWithDetails.length,
        });
    } catch (error) {
        console.error("Get faculty error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch faculty" }, { status: 500 });
    }
}

// POST /api/faculty - Add a new faculty member
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, departmentId, assignedSubjects = [] } = body;

        // Validation
        if (!name || !email || !departmentId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            if (existingUser.isDeleted) {
                // Self-heal: Email was not renamed on deletion previously
                // Rename it now to allow new account creation
                const timestamp = new Date().getTime();
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { email: `deleted_${timestamp}_${existingUser.email}` }
                });
            } else {
                return NextResponse.json(
                    { success: false, error: "User with this email already exists" },
                    { status: 409 }
                );
            }
        }

        // Generate secure password or use provided
        const rawPassword = password || generateSecurePassword();
        const hashedPassword = await hashPassword(rawPassword);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "FACULTY",
                isPasswordChangeRequired: true,
            },
        });

        const newFaculty = await prisma.faculty.create({
            data: {
                departmentId,
                userId: user.id,
                subjects: {
                    connect: assignedSubjects.map((id: string) => ({ id }))
                }
            },
            include: {
                department: true,
                user: true,
                subjects: true
            }
        });

        // Return the RAW password only once
        const responseData = {
            ...newFaculty,
            name: newFaculty.user.name,
            email: newFaculty.user.email,
            generatedPassword: rawPassword, // CAUTION: Only shown once
        };

        return NextResponse.json({
            success: true,
            data: responseData,
            message: "Faculty created successfully. Please save the password.",
        }, { status: 201 });
    } catch (error) {
        console.error("Create faculty error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create faculty" },
            { status: 500 }
        );
    }
}
