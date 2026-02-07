
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { facultyId, subjectId, classroomId, latitude, longitude } = body;

        if (!facultyId || !subjectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if faculty already has an active session
        const existingSession = await prisma.classSession.findFirst({
            where: { facultyId, status: "ACTIVE" },
        });

        if (existingSession) {
            return NextResponse.json({ error: "You already have an active session" }, { status: 400 });
        }

        // Build session data
        const sessionData: any = {
            facultyId,
            subjectId,
            status: "ACTIVE",
            latitude,
            longitude,
        };

        // Add classroomId if provided
        if (classroomId) {
            // Verify classroom exists
            const classroom = await prisma.classroom.findFirst({
                where: { id: classroomId, isDeleted: false },
                select: { name: true },
            });
            if (!classroom) {
                return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
            }
            sessionData.classroomId = classroomId;
        }

        const session = await prisma.classSession.create({
            data: sessionData,
            include: {
                classroom: { select: { name: true } },
            },
        });

        return NextResponse.json({
            id: session.id,
            status: session.status,
            qrEnabled: session.qrEnabled,
            currentQrCode: session.currentQrCode,
            currentQrExpiresAt: session.currentQrExpiresAt,
            classroomId: session.classroomId,
            classroomName: session.classroom?.name,
        });
    } catch (error) {
        console.error("Error starting session:", error);
        return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
    }
}
