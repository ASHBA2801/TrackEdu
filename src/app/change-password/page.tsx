
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function ChangePasswordPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to change password");
            } else {
                setSuccess("Password changed successfully. Redirecting...");
                // Refresh session to update isPasswordChangeRequired status or just redirect
                // Since session strategy is JWT, we might need to re-login or trigger session update.
                // Easiest is to force logout or redirect to dashboard and let next-auth logic handle it.
                // But since the token in cookie is still old (has isPasswordChangeRequired=true), 
                // we probably need to sign out and ask them to login again with new password.
                // OR we rely on session update if implemented. 
                // Let's ask them to login again for security.
                setTimeout(async () => {
                    await signOut({ callbackUrl: "/login" });
                }, 2000);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Change Password</h2>

                {session?.user?.isPasswordChangeRequired && (
                    <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-sm">
                        You must change your password before continuing.
                    </div>
                )}

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Current Password</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full rounded-md border text-gray-900 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="mt-1 block w-full rounded-md border text-gray-900 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="mt-1 block w-full rounded-md border text-gray-900 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? "Changing..." : "Change Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
