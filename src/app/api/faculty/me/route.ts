
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
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
                // Get subjects assigned by HOD via FacultySubjectAssignment
                hodAssignments: {
                    include: {
                        subject: true
                    }
                }
            }
        });

        if (!faculty) {
            return NextResponse.json({ error: "Faculty profile not found" }, { status: 404 });
        }

        // Extract subjects from HOD assignments
        const assignedSubjects = faculty.hodAssignments.map(assignment => ({
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.code,
            semester: assignment.subject.semester,
            departmentId: assignment.subject.departmentId
        }));

        const data = {
            id: faculty.id,
            name: faculty.user.name,
            email: faculty.user.email,
            departmentId: faculty.departmentId,
            departmentName: faculty.department.name,
            assignedSubjects
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Get current faculty error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
