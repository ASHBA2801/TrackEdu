import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Admin HOD [id] API
 * 
 * PATCH /api/admin/hod/[id] - Update HOD (department, status)
 * DELETE /api/admin/hod/[id] - Soft delete HOD
 */

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/hod/[id] - Get single HOD details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const hod = await prisma.hOD.findUnique({
            where: { id, isDeleted: false },
            include: {
                department: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isActive: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!hod) {
            return NextResponse.json(
                { success: false, error: "HOD not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: hod.id,
                userId: hod.userId,
                name: hod.user.name,
                email: hod.user.email,
                departmentId: hod.departmentId,
                departmentName: hod.department?.name,
                isActive: hod.isActive,
                createdAt: hod.createdAt
            }
        });
    } catch (error) {
        console.error("Get HOD error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch HOD" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/hod/[id] - Update HOD
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { departmentId, isActive } = body;

        // Check if HOD exists
        const existingHod = await prisma.hOD.findUnique({
            where: { id, isDeleted: false }
        });

        if (!existingHod) {
            return NextResponse.json(
                { success: false, error: "HOD not found" },
                { status: 404 }
            );
        }

        // Validate department if provided
        if (departmentId) {
            const department = await prisma.department.findUnique({
                where: { id: departmentId }
            });

            if (!department || department.isDeleted) {
                return NextResponse.json(
                    { success: false, error: "Invalid department" },
                    { status: 400 }
                );
            }
        }

        // Update HOD and optionally user isActive
        const updateData: any = {};
        if (departmentId !== undefined) updateData.departmentId = departmentId;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedHod = await prisma.$transaction(async (tx) => {
            const hod = await tx.hOD.update({
                where: { id },
                data: updateData,
                include: {
                    department: true,
                    user: true
                }
            });

            // Sync user isActive with HOD isActive
            if (isActive !== undefined) {
                await tx.user.update({
                    where: { id: hod.userId },
                    data: { isActive }
                });
            }

            return hod;
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedHod.id,
                departmentId: updatedHod.departmentId,
                departmentName: updatedHod.department?.name,
                isActive: updatedHod.isActive
            },
            message: "HOD updated successfully"
        });
    } catch (error) {
        console.error("Update HOD error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update HOD" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/hod/[id] - Soft delete HOD
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const existingHod = await prisma.hOD.findUnique({
            where: { id, isDeleted: false },
            include: { user: true }
        });

        if (!existingHod) {
            return NextResponse.json(
                { success: false, error: "HOD not found" },
                { status: 404 }
            );
        }

        // Soft delete both HOD and associated user
        const timestamp = Date.now();
        await prisma.$transaction([
            prisma.hOD.update({
                where: { id },
                data: { isDeleted: true, isActive: false }
            }),
            prisma.user.update({
                where: { id: existingHod.userId },
                data: {
                    isDeleted: true,
                    isActive: false,
                    email: `deleted_${timestamp}_${existingHod.user.email}`
                }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: "HOD deleted successfully"
        });
    } catch (error) {
        console.error("Delete HOD error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete HOD" },
            { status: 500 }
        );
    }
}
