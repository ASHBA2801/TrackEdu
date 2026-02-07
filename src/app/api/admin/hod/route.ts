import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateSecurePassword } from "@/lib/utils/password";
import { hashPassword } from "@/lib/bcrypt";

/**
 * Admin HOD Management API
 * 
 * GET /api/admin/hod - List all HODs with department info
 * POST /api/admin/hod - Create new HOD with temp password
 * 
 * Assumptions:
 * - Only ADMIN users can access (enforced by middleware)
 * - Each HOD is assigned to exactly one department
 * - HOD user gets isPasswordChangeRequired=true on creation
 */

// GET /api/admin/hod - Get all HODs
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const departmentId = searchParams.get("departmentId");
        const search = searchParams.get("search");
        const activeOnly = searchParams.get("activeOnly") === "true";

        const where: any = { isDeleted: false };

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (activeOnly) {
            where.isActive = true;
        }

        // Search by name or email
        if (search) {
            where.user = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const hodList = await prisma.hOD.findMany({
            where,
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
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const hodsWithDetails = hodList.map(hod => ({
            id: hod.id,
            userId: hod.userId,
            name: hod.user.name,
            email: hod.user.email,
            departmentId: hod.departmentId,
            departmentName: hod.department?.name || "Unknown",
            departmentCode: hod.department?.code || "",
            isActive: hod.isActive,
            createdAt: hod.createdAt
        }));

        return NextResponse.json({
            success: true,
            data: hodsWithDetails,
            total: hodsWithDetails.length
        });
    } catch (error) {
        console.error("Get HODs error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch HODs" },
            { status: 500 }
        );
    }
}

// POST /api/admin/hod - Create new HOD
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, departmentId, generateTempPassword = true } = body;

        // Validation
        if (!name || !email || !departmentId) {
            return NextResponse.json(
                { success: false, error: "Name, email, and department are required" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            if (existingUser.isDeleted) {
                // Self-heal: Rename deleted email to allow new account
                const timestamp = Date.now();
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { email: `deleted_${timestamp}_${existingUser.email}` }
                });
            } else {
                return NextResponse.json(
                    { success: false, error: "A user with this email already exists" },
                    { status: 409 }
                );
            }
        }

        // Check if department exists
        const department = await prisma.department.findUnique({
            where: { id: departmentId }
        });

        if (!department || department.isDeleted) {
            return NextResponse.json(
                { success: false, error: "Invalid department" },
                { status: 400 }
            );
        }

        // Generate or use provided password
        const rawPassword = generateTempPassword ? generateSecurePassword() : (password || generateSecurePassword());
        const hashedPassword = await hashPassword(rawPassword);

        // Create user and HOD in transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "HOD",
                    isPasswordChangeRequired: true
                }
            });

            const hod = await tx.hOD.create({
                data: {
                    userId: user.id,
                    departmentId
                },
                include: {
                    department: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            isActive: true
                        }
                    }
                }
            });

            return hod;
        });

        const responseData = {
            id: result.id,
            userId: result.userId,
            name: result.user.name,
            email: result.user.email,
            departmentId: result.departmentId,
            departmentName: result.department?.name,
            isActive: result.isActive,
            generatedPassword: rawPassword // CAUTION: Only shown once
        };

        return NextResponse.json({
            success: true,
            data: responseData,
            message: "HOD created successfully. Please save the temporary password."
        }, { status: 201 });
    } catch (error) {
        console.error("Create HOD error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create HOD" },
            { status: 500 }
        );
    }
}
