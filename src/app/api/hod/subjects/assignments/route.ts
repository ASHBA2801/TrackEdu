import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * HOD Subject Assignment API
 * 
 * GET /api/hod/subjects/assignments - List all assignments for HOD's department
 * POST /api/hod/subjects/assignments - Create new faculty-subject assignment
 *
 * Authorization: Only HOD can manage assignments for their department
 */

// GET - Get all faculty-subject assignments for HOD's department
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get HOD's department
        const hod = await prisma.hOD.findFirst({
            where: {
                user: { id: session.user.id },
                isDeleted: false
            },
            select: { id: true, departmentId: true }
        });

        if (!hod) {
            return NextResponse.json(
                { success: false, error: "HOD profile not found" },
                { status: 404 }
            );
        }

        // Get all assignments for subjects in this department
        const assignments = await prisma.facultySubjectAssignment.findMany({

            where: {
                subject: {
                    departmentId: hod.departmentId
                }
            },
            include: {
                faculty: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                        department: { select: { id: true, name: true, code: true } }
                    }
                },
                subject: {
                    select: { id: true, name: true, code: true, semester: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Also get department's subjects for the dropdown
        const subjects = await prisma.subject.findMany({
            where: { departmentId: hod.departmentId, isDeleted: false },
            select: { id: true, name: true, code: true, semester: true },
            orderBy: { name: "asc" }
        });

        // Get all faculties for assignment (can be from any department)
        const faculties = await prisma.faculty.findMany({
            where: { isActive: true, isDeleted: false },
            include: {
                user: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true, code: true } }
            },
            orderBy: { user: { name: "asc" } }
        });

        return NextResponse.json({
            success: true,
            data: {
                assignments: assignments.map(a => ({
                    id: a.id,
                    facultyId: a.facultyId,
                    facultyName: a.faculty.user.name,
                    facultyEmail: a.faculty.user.email,
                    facultyDepartment: a.faculty.department?.name,
                    subjectId: a.subjectId,
                    subjectName: a.subject.name,
                    subjectCode: a.subject.code,
                    semester: a.subject.semester,
                    createdAt: a.createdAt
                })),
                subjects: subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    semester: s.semester
                })),
                faculties: faculties.map(f => ({
                    id: f.id,
                    name: f.user.name,
                    email: f.user.email,
                    department: f.department?.name
                }))
            }
        });
    } catch (error) {
        console.error("Get assignments error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch assignments" },
            { status: 500 }
        );
    }
}

// POST - Create new faculty-subject assignment
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { facultyId, subjectId } = body;

        if (!facultyId || !subjectId) {
            return NextResponse.json(
                { success: false, error: "Faculty and subject are required" },
                { status: 400 }
            );
        }

        // Get HOD's department and id
        const hod = await prisma.hOD.findFirst({
            where: {
                user: { id: session.user.id },
                isDeleted: false
            },
            select: { id: true, departmentId: true }
        });

        if (!hod) {
            return NextResponse.json(
                { success: false, error: "HOD profile not found" },
                { status: 404 }
            );
        }


        // Verify subject belongs to HOD's department
        const subject = await prisma.subject.findUnique({
            where: { id: subjectId }
        });

        if (!subject || subject.departmentId !== hod.departmentId) {
            return NextResponse.json(
                { success: false, error: "Subject must belong to your department" },
                { status: 403 }
            );
        }

        // Verify faculty exists
        const faculty = await prisma.faculty.findUnique({
            where: { id: facultyId, isActive: true, isDeleted: false }
        });

        if (!faculty) {
            return NextResponse.json(
                { success: false, error: "Faculty not found" },
                { status: 404 }
            );
        }

        // Check for existing assignment
        const existing = await prisma.facultySubjectAssignment.findUnique({
            where: {
                facultyId_subjectId: { facultyId, subjectId }
            }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: "This faculty is already assigned to this subject" },
                { status: 409 }
            );
        }

        // Create assignment
        const assignment = await prisma.facultySubjectAssignment.create({
            data: {
                facultyId,
                subjectId,
                assignedByHodId: hod.id
            },
            include: {
                faculty: {
                    include: {
                        user: { select: { name: true, email: true } },
                        department: { select: { name: true } }
                    }
                },
                subject: { select: { name: true, code: true } }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: assignment.id,
                facultyName: assignment.faculty.user.name,
                subjectName: assignment.subject.name,
                subjectCode: assignment.subject.code
            },
            message: "Faculty assigned to subject successfully"
        }, { status: 201 });
    } catch (error) {
        console.error("Create assignment error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create assignment" },
            { status: 500 }
        );
    }
}
