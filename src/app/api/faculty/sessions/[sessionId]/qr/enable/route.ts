
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQrCode } from "@/lib/utils/qr";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await props.params;
        const { sessionId } = params;

        // Must be a valid active session
        const session = await prisma.classSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.status !== "ACTIVE") {
            return NextResponse.json({ error: "Invalid or inactive session" }, { status: 404 });
        }

        const newCode = generateQrCode();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 1000); // 15 seconds

        const updatedSession = await prisma.classSession.update({
            where: { id: sessionId },
            data: {
                qrEnabled: true,
                currentQrCode: newCode,
                currentQrExpiresAt: expiresAt,
                qrEnabledAt: now,
            },
        });

        return NextResponse.json({
            code: updatedSession.currentQrCode,
            expiresAt: updatedSession.currentQrExpiresAt
        });
    } catch (error) {
        console.error("Error enabling QR:", error);
        return NextResponse.json({ error: "Failed to enable QR" }, { status: 500 });
    }
}
