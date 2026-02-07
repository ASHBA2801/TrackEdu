import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

/**
 * HOD Subject Assignment [id] API
 * 
 * DELETE /api/hod/subjects/assignments/[id] - Remove faculty-subject assignment
 */

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE - Remove faculty-subject assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const token = await getToken({ req: request });
        if (!token || token.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Get HOD's department
        const hod = await prisma.hOD.findUnique({
            where: { userId: token.id as string },
            select: { id: true, departmentId: true }
        });

        if (!hod) {
            return NextResponse.json(
                { success: false, error: "HOD profile not found" },
                { status: 404 }
            );
        }

        // Find assignment and verify it belongs to HOD's department
        const assignment = await prisma.facultySubjectAssignment.findUnique({
            where: { id },
            include: {
                subject: { select: { departmentId: true } }
            }
        });

        if (!assignment) {
            return NextResponse.json(
                { success: false, error: "Assignment not found" },
                { status: 404 }
            );
        }

        if (assignment.subject.departmentId !== hod.departmentId) {
            return NextResponse.json(
                { success: false, error: "You can only remove assignments for your department's subjects" },
                { status: 403 }
            );
        }

        // Delete assignment
        await prisma.facultySubjectAssignment.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: "Assignment removed successfully"
        });
    } catch (error) {
        console.error("Delete assignment error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove assignment" },
            { status: 500 }
        );
    }
}
