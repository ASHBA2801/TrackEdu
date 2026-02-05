
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { facultyId, subjectId, latitude, longitude } = body;

        if (!facultyId || !subjectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Optional: Check if session already active?
        // For now, just create new one

        const session = await prisma.classSession.create({
            data: {
                facultyId,
                subjectId,
                status: "ACTIVE",
                latitude,
                longitude,
                // QR disabled by default
            },
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error("Error starting session:", error);
        return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
    }
}
