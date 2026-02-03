"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface User {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "FACULTY" | "ADMIN";
    isActive: boolean;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [updateLoading, setUpdateLoading] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });
            if (search) params.set("search", search);
            if (roleFilter) params.set("role", roleFilter);

            const response = await fetch(`/api/admin/users?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch users");
            }

            setUsers(data.users);
            setPagination(data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, search, roleFilter]);

    useEffect(() => {
        if (status === "loading") return;
        if (!session || session.user?.role !== "ADMIN") {
            router.push("/dashboard");
            return;
        }
        fetchUsers();
    }, [session, status, router, fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdateLoading(userId);
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to update role");
            }

            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole as User["role"] } : u
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update role");
        } finally {
            setUpdateLoading(null);
        }
    };

    const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
        setUpdateLoading(userId);
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, isActive: !currentStatus }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to update status");
            }

            setUsers(users.map(u =>
                u.id === userId ? { ...u, isActive: !currentStatus } : u
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setUpdateLoading(null);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`/api/admin/users?userId=${userToDelete.id}`, {
                method: "DELETE",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to delete user");
            }

            // Remove user from list
            setUsers(users.filter(u => u.id !== userToDelete.id));
            setPagination(prev => ({
                ...prev,
                total: prev.total - 1
            }));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete user");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers();
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">User Management</h1>
                            <p className="text-blue-100 mt-1">Manage user roles and account status</p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/admin")}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Filters */}
                <Card className="mb-6 p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                            <option value="">All Roles</option>
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </Card>

                {/* Users Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={updateLoading === user.id || user.id === session?.user?.id}
                                                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${user.role === "ADMIN"
                                                        ? "bg-purple-50 border-purple-200 text-purple-700"
                                                        : user.role === "FACULTY"
                                                            ? "bg-blue-50 border-blue-200 text-blue-700"
                                                            : "bg-green-50 border-green-200 text-green-700"
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <option value="STUDENT">Student</option>
                                                    <option value="FACULTY">Faculty</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user.isActive
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"
                                                        }`}></span>
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleStatusToggle(user.id, user.isActive)}
                                                        disabled={updateLoading === user.id || user.id === session?.user?.id}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${user.isActive
                                                            ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                                            : "bg-green-50 text-green-600 hover:bg-green-100"
                                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        {updateLoading === user.id
                                                            ? "..."
                                                            : user.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={updateLoading === user.id || user.id === session?.user?.id}
                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                                {pagination.total} users
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete User"
                description={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone.`}
                confirmText="Delete User"
                variant="danger"
            />
        </div>
    );
}
