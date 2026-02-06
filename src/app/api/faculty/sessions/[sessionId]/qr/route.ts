
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQrCode } from "@/lib/utils/qr";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await props.params;
        const { sessionId } = params;

        const session = await prisma.classSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.status !== "ACTIVE") {
            return NextResponse.json({ error: "Invalid session" }, { status: 404 });
        }

        if (!session.qrEnabled) {
            return NextResponse.json({ status: "disabled" });
        }

        const now = new Date();
        // Check if expired
        if (session.currentQrExpiresAt && session.currentQrExpiresAt < now) {
            // Rotate code
            const newCode = generateQrCode();
            const expiresAt = new Date(now.getTime() + 15 * 1000);

            const updated = await prisma.classSession.update({
                where: { id: sessionId },
                data: {
                    currentQrCode: newCode,
                    currentQrExpiresAt: expiresAt,
                }
            });
            return NextResponse.json({ code: updated.currentQrCode, expiresAt: updated.currentQrExpiresAt });
        }

        // Return current valid code
        return NextResponse.json({ code: session.currentQrCode, expiresAt: session.currentQrExpiresAt });

    } catch (error) {
        console.error("Error fetching QR:", error);
        return NextResponse.json({ error: "Failed to fetch QR" }, { status: 500 });
    }
}
