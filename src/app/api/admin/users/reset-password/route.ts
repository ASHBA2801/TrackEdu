
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSecurePassword } from "@/lib/utils/password";
import { hashPassword } from "@/lib/bcrypt";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
        }

        const newPassword = generateSecurePassword();
        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isPasswordChangeRequired: true,
            },
        });

        // In a real app, we might email this. For now, we return it to the admin.
        return NextResponse.json({
            success: true,
            newPassword,
            message: "Password reset successfully. Please share this new password with the user.",
        });

    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ success: false, error: "Failed to reset password" }, { status: 500 });
    }
}
