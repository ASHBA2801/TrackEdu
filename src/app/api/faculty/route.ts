import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
        const { name, email, departmentId, assignedSubjects = [] } = body;

        if (!name || !email || !departmentId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const tempPassword = "password123";

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: tempPassword,
                role: "FACULTY",
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

        const responseData = {
            ...newFaculty,
            name: newFaculty.user.name,
            email: newFaculty.user.email,
        };

        return NextResponse.json({
            success: true,
            data: responseData,
            message: "Faculty created successfully",
        }, { status: 201 });
    } catch (error) {
        console.error("Create faculty error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create faculty" },
            { status: 500 }
        );
    }
}
