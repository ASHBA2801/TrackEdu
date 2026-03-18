import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

/**
 * HOD On-Duty Permission API
 * 
 * GET /api/hod/on-duty - List all OD permissions for HOD's department
 * POST /api/hod/on-duty - Create new OD permission for a student
 */

// GET - Get all on-duty permissions for HOD's department
export async function GET(request: NextRequest) {
    try {
        const token = await getToken({ req: request });
        if (!token || token.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get("status"); // ACTIVE, REVOKED, or all

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

        // Build where clause
        const where: { departmentId: string; status?: "ACTIVE" | "REVOKED" } = { departmentId: hod.departmentId };
        if (status && status !== "all") {
            where.status = status as "ACTIVE" | "REVOKED";
        }

        // Get OD permissions
        const permissions = await prisma.onDutyPermission.findMany({
            where: where as any, // Type assertion to bypass strict typing
            include: {
                student: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Get students in department for the create form
        const students = await prisma.student.findMany({
            where: { departmentId: hod.departmentId, isActive: true, isDeleted: false },
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { rollNumber: "asc" }
        });

        return NextResponse.json({
            success: true,
            data: {
                permissions: permissions.map(p => ({
                    id: p.id,
                    studentId: p.studentId,
                    studentName: p.student.user.name,
                    studentEmail: p.student.user.email,
                    rollNumber: p.student.rollNumber,
                    startDate: p.startDate.toISOString().split('T')[0],
                    endDate: p.endDate.toISOString().split('T')[0],
                    reason: p.reason,
                    status: p.status,
                    createdAt: p.createdAt,
                    revokedAt: p.revokedAt
                })),
                students: students.map(s => ({
                    id: s.id,
                    name: s.user.name,
                    email: s.user.email,
                    rollNumber: s.rollNumber
                }))
            }
        });
    } catch (error) {
        console.error("Get OD permissions error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch permissions" },
            { status: 500 }
        );
    }
}

// POST - Create new OD permission
export async function POST(request: NextRequest) {
    try {
        const token = await getToken({ req: request });
        if (!token || token.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { studentId, startDate, endDate, reason } = body;

        if (!studentId || !startDate || !endDate || !reason) {
            return NextResponse.json(
                { success: false, error: "Student, date range, and reason are required" },
                { status: 400 }
            );
        }

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

        // Verify student belongs to HOD's department
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        });

        if (!student || student.departmentId !== hod.departmentId) {
            return NextResponse.json(
                { success: false, error: "Student must be from your department" },
                { status: 403 }
            );
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end < start) {
            return NextResponse.json(
                { success: false, error: "End date must be after start date" },
                { status: 400 }
            );
        }

        // Check for overlapping active OD permissions
        const overlapping = await prisma.onDutyPermission.findFirst({
            where: {
                studentId,
                status: "ACTIVE",
                OR: [
                    { startDate: { lte: end }, endDate: { gte: start } }
                ]
            }
        });

        if (overlapping) {
            return NextResponse.json(
                { success: false, error: "Student already has an active OD permission for this period" },
                { status: 409 }
            );
        }

        // Create OD permission
        const permission = await prisma.onDutyPermission.create({
            data: {
                studentId,
                departmentId: hod.departmentId,
                startDate: start,
                endDate: end,
                reason,
                createdByHodId: hod.id
            },
            include: {
                student: {
                    include: { user: { select: { name: true } } }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: permission.id,
                studentName: permission.student.user.name,
                startDate: permission.startDate.toISOString().split('T')[0],
                endDate: permission.endDate.toISOString().split('T')[0]
            },
            message: "On-Duty permission granted successfully"
        }, { status: 201 });
    } catch (error) {
        console.error("Create OD permission error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create permission" },
            { status: 500 }
        );
    }
}
