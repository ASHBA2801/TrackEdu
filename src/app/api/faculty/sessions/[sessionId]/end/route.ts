
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await props.params;
        const { sessionId } = params;

        // Get session details including classroom
        const sessionCheck = await prisma.classSession.findFirst({
            where: { id: sessionId },
            select: {
                classroomId: true,
                subjectId: true,
                startTime: true,
                subject: {
                    select: {
                        departmentId: true,
                    },
                },
            },
        });

        if (!sessionCheck) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Close session and disable QR
        const session = await prisma.classSession.update({
            where: { id: sessionId },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                qrEnabled: false,
                currentQrCode: null,
            },
        });

        // Get potential students based on classroom or department
        let potentialStudents: { id: string }[];

        if (sessionCheck.classroomId) {
            // If session has a classroom, use classroom students
            const classroomStudents = await prisma.classroomStudent.findMany({
                where: { classroomId: sessionCheck.classroomId },
                include: {
                    student: {
                        select: { id: true, isActive: true, isDeleted: true },
                    },
                },
            });
            potentialStudents = classroomStudents
                .filter(cs => cs.student && cs.student.isActive && !cs.student.isDeleted)
                .map(cs => ({ id: cs.student.id }));
        } else {
            // Fallback to all department students
            const deptStudents = await prisma.student.findMany({
                where: {
                    departmentId: sessionCheck.subject.departmentId,
                    isActive: true,
                    isDeleted: false,
                },
                select: { id: true },
            });
            potentialStudents = deptStudents;
        }

        // Find already marked students (PRESENT)
        const existingAttendance = await prisma.attendance.findMany({
            where: { classSessionId: sessionId },
            select: { studentId: true },
        });

        const presentStudentIds = new Set(existingAttendance.map(a => a.studentId));

        // Check for approved leaves on this date
        const sessionDate = new Date(sessionCheck.startTime);
        sessionDate.setHours(0, 0, 0, 0);

        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                studentId: { in: potentialStudents.map(s => s.id) },
                leaveDate: sessionDate,
                status: 'APPROVED',
            },
            select: { studentId: true },
        });

        const leaveStudentIds = new Set(approvedLeaves.map(l => l.studentId));

        // Identify students needing records
        const studentsNeedingRecords = potentialStudents.filter(s => !presentStudentIds.has(s.id));

        // Separate into ABSENT and LEAVE
        const absentStudents = studentsNeedingRecords.filter(s => !leaveStudentIds.has(s.id));
        const leaveStudents = studentsNeedingRecords.filter(s => leaveStudentIds.has(s.id));

        // Bulk create ABSENT records
        if (absentStudents.length > 0) {
            await prisma.attendance.createMany({
                data: absentStudents.map(s => ({
                    date: sessionCheck.startTime,
                    status: "ABSENT",
                    studentId: s.id,
                    subjectId: sessionCheck.subjectId,
                    classSessionId: sessionId,
                })),
            });
        }

        // Bulk create LEAVE records
        if (leaveStudents.length > 0) {
            await prisma.attendance.createMany({
                data: leaveStudents.map(s => ({
                    date: sessionCheck.startTime,
                    status: "LEAVE",
                    studentId: s.id,
                    subjectId: sessionCheck.subjectId,
                    classSessionId: sessionId,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            presentCount: existingAttendance.length,
            absentsMarked: absentStudents.length,
            leavesMarked: leaveStudents.length,
        });
    } catch (error) {
        console.error("Error ending session:", error);
        return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
    }
}
