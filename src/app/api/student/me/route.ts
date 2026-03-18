
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find student profile linked to this user
        const student = await prisma.student.findUnique({
            where: { userId: session.user.id },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                department: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }

        const data = {
            id: student.id,
            name: student.user.name,
            email: student.user.email,
            departmentName: student.department.name,
            rollNumber: student.rollNumber,
            year: student.year,
            section: student.section,
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Get current student error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
