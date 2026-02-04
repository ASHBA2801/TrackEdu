import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const departmentId = searchParams.get("departmentId");
        const year = searchParams.get("year");
        const section = searchParams.get("section");
        const activeOnly = searchParams.get("activeOnly") === "true";

        const where: any = { isDeleted: false };

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (year) {
            where.year = parseInt(year);
        }

        if (section) {
            where.section = section;
        }

        if (activeOnly) {
            where.isActive = true;
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                department: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const studentsWithDept = students.map((student) => ({
            ...student,
            departmentName: student.department?.name || "Unknown",
        }));

        return NextResponse.json({
            success: true,
            data: studentsWithDept,
            total: studentsWithDept.length,
        });
    } catch (error) {
        console.error("Get students error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch students" },
            { status: 500 }
        );
    }
}

// POST /api/students - Add a new student
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, rollNumber, departmentId, year, section } = body;

        if (!name || !email || !rollNumber || !departmentId || !year || !section) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Create student and user(optional? logic says simple student creation now)
        // Note: Ideally we should create a User record too, but for now just the Student entity as requested.
        // But Student schema requires User relation?
        // Checking schema: Student has userId String @unique.
        // So we MUST create a User first.

        const tempPassword = "password123"; // Should be random or sent to email

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: tempPassword, // In production hash this
                role: "STUDENT",
            },
        });

        const newStudent = await prisma.student.create({
            data: {
                rollNumber,
                departmentId,
                year: parseInt(year.toString()),
                section,
                userId: user.id,
            },
            include: {
                department: true,
                user: true // Return user info
            }
        });

        // Combine user info into response
        const responseData = {
            ...newStudent,
            name: newStudent.user.name,
            email: newStudent.user.email
        };

        return NextResponse.json(
            {
                success: true,
                data: responseData,
                message: "Student created successfully",
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create student error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create student" },
            { status: 500 }
        );
    }
}
