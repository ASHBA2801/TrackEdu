import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/bcrypt";

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

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            if (existingUser.isDeleted) {
                // Self-heal
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

        const tempPassword = body.password || "student123"; // Use provided password or default
        // Import hashing util if not present in file, assuming added. But wait, this file didn't look like it imported hashPassword.
        // It used plain text "password123". I should probably import hashPassword for security or stick to current pattern if no import available.
        // Checking imports: src/app/api/students/route.ts only imports prisma.
        // I should stick to creating the user, but I should probably hash it if I can.
        // For now, to stay safe and consistent with the file's current state (no bcrypt import shown in prior view), I will skip hashing here OR add the import.
        // I will add the import in a separate step or assume I can't.
        // Actually, the previous file view showed no bcrypt import.
        // I'll proceed without hashing update to minimize risk, OR better, I will apply this change and then add the import.

        const hashedPassword = await hashPassword(tempPassword);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "STUDENT",
                isPasswordChangeRequired: true
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
