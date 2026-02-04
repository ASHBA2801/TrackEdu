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

interface Toast {
    message: string;
    type: "success" | "error";
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
    const [toast, setToast] = useState<Toast | null>(null);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [updateLoading, setUpdateLoading] = useState<string | null>(null);

    // Reset Password State
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
    const [resettingUser, setResettingUser] = useState<User | null>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchUsers = useCallback(async (page: number, limit: number, searchTerm: string, role: string) => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (searchTerm) params.set("search", searchTerm);
            if (role) params.set("role", role);

            const response = await fetch(`/api/admin/users?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch users");
            }

            setUsers(data.users);
            setPagination(data.pagination);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "An error occurred", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (status === "loading") return;
        if (!session || session.user?.role !== "ADMIN") {
            router.push("/dashboard");
            return;
        }
        // Only fetch if session is valid
        fetchUsers(pagination.page, pagination.limit, search, roleFilter);
    }, [session, status, router, fetchUsers, pagination.page, pagination.limit, search, roleFilter]);


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

            // Update with returned user data to be safe
            setUsers(users.map(u =>
                u.id === userId && data.user ? { ...u, role: data.user.role } : u
            ));
            showToast("Role updated successfully", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to update role", "error");
        } finally {
            setUpdateLoading(null);
        }
    };

    const handleResetPassword = async (user: User) => {
        if (!confirm(`Are you sure you want to reset password for ${user.name}?`)) return;

        setUpdateLoading(user.id);
        setResettingUser(user);
        try {
            const response = await fetch("/api/admin/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setResetPasswordResult(data.newPassword);
            setResetModalOpen(true);
            showToast("Password reset successfully", "success");
        } catch (err: any) {
            showToast(err.message || "Failed to reset password", "error");
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
            showToast("Status updated successfully", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to update status", "error");
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
            showToast("User deleted successfully", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to delete user", "error");
        } finally {
            setDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Update pagination page to 1, then fetch will happen via useEffect?
        // OR better: Update state, and let useEffect handle it.
        // However, setting state is async. If we rely on useEffect, we just setPage(1).
        setPagination(prev => ({ ...prev, page: 1 }));
        // fetchUsers will be triggered by useEffect when pagination.page (or search) changes
        // But wait, 'search' state updates immediately? NO.
        // We are using 'search' state which already updated via onChange of input?
        // Input onChange: setSearch(e.target.value).
        // If we want to search ONLY on submit, we should have a separate 'debounce' or 'activeSearch' state.
        // But the current code uses `search` state directly in fetch.
        // If we rely on useEffect, it will fetch on EVERY keystroke if `search` is in dependency array.
        // The user's code had `onSubmit`.
        // To support "Search on Submit", we should NOT put `search` in useEffect dependency array unless we want live search.
        // If we want "Search on Submit", we need a separate `submittedSearch` state.
        // OR, we just call fetchUsers explicitly in handleSearch.

        // Let's stick to explicit fetch in handleSearch for now to match the "form submit" pattern.
        // BUT `useEffect` will also fire if `pagination.page` changes.
        // To sync properly:
        // 1. handleSearch -> updates `submittedQuery` state? -> useEffect triggers.
        // This is the cleanest React way.

        // Let's assume for now we want explicit fetch on submit.
        fetchUsers(1, pagination.limit, search, roleFilter);
    };

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ease-in-out ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
                    }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "success" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {toast.message}
                    </div>
                </div>
            )}

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
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Filters */}
                <Card className="mb-6 p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-pointer"
                        >
                            <option value="">All Roles</option>
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                        >
                            Search
                        </button>
                    </form>
                </Card>

                {/* Users Table */}
                <Card className="overflow-hidden border border-gray-200 shadow-sm">
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
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold shadow-sm">
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
                                                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${user.role === "ADMIN"
                                                        ? "bg-purple-50 border-purple-200 text-purple-700 focus:ring-purple-200"
                                                        : user.role === "FACULTY"
                                                            ? "bg-blue-50 border-blue-200 text-blue-700 focus:ring-blue-200"
                                                            : "bg-green-50 border-green-200 text-green-700 focus:ring-green-200"
                                                        } disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2`}
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
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${user.isActive
                                                            ? "bg-white border-gray-200 text-orange-600 hover:bg-orange-50 hover:border-orange-200"
                                                            : "bg-white border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-200"
                                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        {updateLoading === user.id
                                                            ? "..."
                                                            : user.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(user)}
                                                        disabled={updateLoading === user.id}
                                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50"
                                                        title="Reset Password"
                                                    >
                                                        Reset
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        disabled={updateLoading === user.id || user.id === session?.user?.id}
                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <div className="text-sm text-gray-500">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                                {pagination.total} users
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

            {/* Reset Password Result Modal */}
            {resetModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Password Reset Successful</h3>
                        <p className="text-gray-600 mb-4">
                            The password for <strong>{resettingUser?.name}</strong> has been reset.
                            Please share this new password with them immediately.
                        </p>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 text-center font-mono text-xl font-bold text-green-700 select-all">
                            {resetPasswordResult}
                        </div>
                        <button
                            onClick={() => {
                                setResetModalOpen(false);
                                setResetPasswordResult(null);
                                setResettingUser(null);
                            }}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
