"use client";

import { useState } from "react";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormErrors {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const resetForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        setSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!currentPassword) {
            newErrors.currentPassword = "Current password is required";
        }

        if (!newPassword) {
            newErrors.newPassword = "New password is required";
        } else if (newPassword.length < 8) {
            newErrors.newPassword = "Password must be at least 8 characters";
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your new password";
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        if (currentPassword && newPassword && currentPassword === newPassword) {
            newErrors.newPassword = "New password must be different from current password";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrors({ general: data.error || "Something went wrong" });
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setIsLoading(false);

            // Close modal after showing success
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch {
            setErrors({ general: "An unexpected error occurred. Please try again." });
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-2xl transition-all">
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                        </div>
                        <p className="text-sm text-gray-500">
                            Enter your current password and choose a new one
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Password Updated!</h3>
                            <p className="text-gray-500">Your password has been changed successfully.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* General Error */}
                            {errors.general && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {errors.general}
                                </div>
                            )}

                            {/* Current Password */}
                            <div>
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Password
                                </label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={isLoading}
                                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.currentPassword ? "border-red-300" : "border-gray-200"
                                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-800 disabled:bg-gray-50`}
                                    placeholder="Enter current password"
                                />
                                {errors.currentPassword && (
                                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                                )}
                            </div>

                            {/* New Password */}
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.newPassword ? "border-red-300" : "border-gray-200"
                                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-800 disabled:bg-gray-50`}
                                    placeholder="Enter new password"
                                />
                                {errors.newPassword && (
                                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.confirmPassword ? "border-red-300" : "border-gray-200"
                                        } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-800 disabled:bg-gray-50`}
                                    placeholder="Confirm new password"
                                />
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Password"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
