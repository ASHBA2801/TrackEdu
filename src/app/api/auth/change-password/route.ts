
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/bcrypt";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ success: false, error: "New password must be at least 8 characters" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.password) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, error: "Incorrect current password" }, { status: 400 });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                password: hashedPassword,
                isPasswordChangeRequired: false,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ success: false, error: "Failed to change password" }, { status: 500 });
    }
}
