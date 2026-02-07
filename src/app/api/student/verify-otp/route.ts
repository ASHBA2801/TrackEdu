import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";

/**
 * Student OTP Verification API
 * 
 * POST /api/student/verify-otp - Verify the OTP entered by student
 * 
 * Rules:
 * - Max 5 attempts per OTP
 * - OTP must not be expired (60 seconds from creation)
 * - OTP can only be used once
 */

// Helper: Hash OTP for comparison
function hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.toUpperCase()).digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        const token = await getToken({ req: request });
        if (!token || token.role !== "STUDENT") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { otp } = body;

        if (!otp || typeof otp !== 'string' || otp.length !== 6) {
            return NextResponse.json(
                { success: false, error: "Please enter a valid 6-character OTP" },
                { status: 400 }
            );
        }

        // Get student
        const student = await prisma.student.findUnique({
            where: { userId: token.id as string }
        });

        if (!student) {
            return NextResponse.json(
                { success: false, error: "Student profile not found" },
                { status: 404 }
            );
        }

        // Find valid OTP (not used, not expired)
        const validOtp = await prisma.studentOtp.findFirst({
            where: {
                studentId: student.id,
                isUsed: false,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!validOtp) {
            return NextResponse.json(
                { success: false, error: "No valid OTP found. Please request a new OTP from your HOD." },
                { status: 404 }
            );
        }

        // Check attempts limit
        if (validOtp.attempts >= 5) {
            // Invalidate OTP after 5 attempts
            await prisma.studentOtp.update({
                where: { id: validOtp.id },
                data: { isUsed: true }
            });

            return NextResponse.json(
                { success: false, error: "Maximum attempts exceeded. Please request a new OTP from your HOD." },
                { status: 429 }
            );
        }

        // Hash provided OTP and compare
        const hashedInput = hashOtp(otp);

        if (hashedInput !== validOtp.otpHash) {
            // Increment attempts
            await prisma.studentOtp.update({
                where: { id: validOtp.id },
                data: { attempts: { increment: 1 } }
            });

            const remainingAttempts = 5 - (validOtp.attempts + 1);
            return NextResponse.json(
                {
                    success: false,
                    error: `Incorrect OTP. ${remainingAttempts} attempt(s) remaining.`
                },
                { status: 401 }
            );
        }

        // OTP matches! Mark as used
        await prisma.studentOtp.update({
            where: { id: validOtp.id },
            data: { isUsed: true }
        });

        // The actual session update for OTP verification happens in the middleware/auth
        // Here we just confirm the verification was successful
        return NextResponse.json({
            success: true,
            message: "OTP verified successfully! You can now access your dashboard."
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to verify OTP" },
            { status: 500 }
        );
    }
}
