
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ sessionId: string }> }
) {
    try {
        const params = await props.params;
        const { sessionId } = params;

        await prisma.classSession.update({
            where: { id: sessionId },
            data: {
                qrEnabled: false,
                currentQrCode: null,
                currentQrExpiresAt: null,
                qrDisabledAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error disabling QR:", error);
        return NextResponse.json({ error: "Failed to disable QR" }, { status: 500 });
    }
}
