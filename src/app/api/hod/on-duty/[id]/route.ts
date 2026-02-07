import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

/**
 * HOD On-Duty Permission [id] API
 * 
 * PATCH /api/hod/on-duty/[id] - Revoke OD permission
 */

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PATCH - Revoke OD permission
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const token = await getToken({ req: request });
        if (!token || token.role !== "HOD") {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { action } = body; // "revoke"

        // Get HOD's department
        const hod = await prisma.hOD.findUnique({
            where: { userId: token.id as string },
            select: { id: true, departmentId: true }
        });

        if (!hod) {
            return NextResponse.json(
                { success: false, error: "HOD profile not found" },
                { status: 404 }
            );
        }

        // Find permission and verify it belongs to HOD's department
        const permission = await prisma.onDutyPermission.findUnique({
            where: { id }
        });

        if (!permission) {
            return NextResponse.json(
                { success: false, error: "Permission not found" },
                { status: 404 }
            );
        }

        if (permission.departmentId !== hod.departmentId) {
            return NextResponse.json(
                { success: false, error: "You can only manage permissions for your department" },
                { status: 403 }
            );
        }

        if (action === "revoke") {
            if (permission.status === "REVOKED") {
                return NextResponse.json(
                    { success: false, error: "Permission is already revoked" },
                    { status: 400 }
                );
            }

            await prisma.onDutyPermission.update({
                where: { id },
                data: {
                    status: "REVOKED",
                    revokedAt: new Date()
                }
            });

            return NextResponse.json({
                success: true,
                message: "On-Duty permission revoked successfully"
            });
        }

        return NextResponse.json(
            { success: false, error: "Invalid action" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Update OD permission error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update permission" },
            { status: 500 }
        );
    }
}
