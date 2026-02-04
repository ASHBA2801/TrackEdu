
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find faculty profile linked to this user
        const faculty = await prisma.faculty.findUnique({
            where: { userId: session.user.id },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                department: true,
                subjects: true
            }
        });

        if (!faculty) {
            return NextResponse.json({ error: "Faculty profile not found" }, { status: 404 });
        }

        const data = {
            id: faculty.id,
            name: faculty.user.name,
            email: faculty.user.email,
            departmentName: faculty.department.name,
            assignedSubjects: faculty.subjects.map(sub => ({
                id: sub.id,
                name: sub.name,
                code: sub.code,
                semester: sub.semester,
                departmentId: sub.departmentId
            }))
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Get current faculty error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
