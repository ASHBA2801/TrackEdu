'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, PageHeader, Modal } from '@/components/ui';
import Link from 'next/link';

/**
 * HOD OTP Generation Page
 * 
 * Features:
 * - Generate OTP for students in department
 * - View recent OTP history
 * - Display OTP prominently for verbal/visual transfer to student
 */

interface OTPRecord {
    id: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    createdAt: string;
    expiresAt: string;
    isUsed: boolean;
    isExpired: boolean;
    attempts: number;
}

interface Student {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
}

export default function HODOtpPage() {
    const [otpHistory, setOtpHistory] = useState<OTPRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState<{ otp: string; studentName: string; expiresAt: string } | null>(null);

    // Form state
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [countdown, setCountdown] = useState(60);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/hod/otp');
            const data = await res.json();

            if (data.success) {
                setOtpHistory(data.data.otps);
                setStudents(data.data.students);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown timer for displayed OTP
    useEffect(() => {
        if (showOtpModal && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(c => c - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (countdown === 0) {
            setShowOtpModal(false);
            setGeneratedOtp(null);
            setCountdown(60);
        }
    }, [showOtpModal, countdown]);

    const handleGenerateOtp = async () => {
        setFormError('');

        if (!selectedStudent) {
            setFormError('Please select a student');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/hod/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: selectedStudent })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate OTP');
            }

            setGeneratedOtp(data.data);
            setShowGenerateModal(false);
            setShowOtpModal(true);
            setCountdown(60);
            fetchData();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeOtpModal = () => {
        setShowOtpModal(false);
        setGeneratedOtp(null);
        setCountdown(60);
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="HOD Portal" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <Link href="/dashboard/hod" className="text-sm text-blue-600 hover:underline">
                            ← Back to Dashboard
                        </Link>
                    </div>

                    {/* Page Header */}
                    <PageHeader
                        title="Student OTP"
                        subtitle="Generate one-time passwords for student verification"
                    >
                        <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
                            + Generate OTP
                        </Button>
                    </PageHeader>

                    {/* Info Card */}
                    <Card className="mb-6 bg-blue-50 border-blue-200">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-medium text-blue-800">How OTP Verification Works</h3>
                                <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                                    <li>Generate an OTP for a student when they need to verify their identity</li>
                                    <li>Each OTP is valid for <strong>60 seconds</strong></li>
                                    <li>Students have a maximum of <strong>5 attempts</strong> to enter the correct OTP</li>
                                    <li>Share the OTP verbally or visually - never via insecure channels</li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Recent OTP History */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <Card>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent OTP History (Last 24h)</h3>
                            {otpHistory.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No OTPs generated in the last 24 hours
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Generated</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attempts</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {otpHistory.map(record => (
                                                <tr key={record.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4">
                                                        <div className="text-sm font-medium text-gray-800">{record.studentName}</div>
                                                        <div className="text-xs text-gray-500">{record.studentEmail}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {record.rollNumber}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {formatDate(record.createdAt)} {formatTime(record.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {record.attempts}/5
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.isUsed
                                                                ? 'bg-green-100 text-green-700'
                                                                : record.isExpired
                                                                    ? 'bg-gray-100 text-gray-600'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {record.isUsed ? 'Used' : record.isExpired ? 'Expired' : 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}
                </main>

                {/* Generate OTP Modal */}
                <Modal
                    isOpen={showGenerateModal}
                    onClose={() => setShowGenerateModal(false)}
                    title="Generate OTP"
                    size="md"
                >
                    <div className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {formError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Student *
                            </label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Choose a student</option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.rollNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className="text-xs text-gray-500">
                            The OTP will be displayed on screen once for 60 seconds.
                        </p>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowGenerateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleGenerateOtp}
                                isLoading={isSubmitting}
                            >
                                Generate
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Display OTP Modal */}
                <Modal
                    isOpen={showOtpModal}
                    onClose={closeOtpModal}
                    title="OTP Generated"
                    size="md"
                >
                    {generatedOtp && (
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-4">
                                Share this OTP with <strong>{generatedOtp.studentName}</strong>
                            </p>

                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-4">
                                <p className="text-6xl font-mono font-bold text-white tracking-[0.25em]">
                                    {generatedOtp.otp}
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div className={`w-3 h-3 rounded-full ${countdown > 30 ? 'bg-green-500' : countdown > 10 ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`}></div>
                                <span className={`text-lg font-semibold ${countdown > 30 ? 'text-green-600' : countdown > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {countdown}s remaining
                                </span>
                            </div>

                            <p className="text-xs text-gray-500 mb-6">
                                This OTP is shown only once. Do not share via insecure channels.
                            </p>

                            <Button variant="secondary" onClick={closeOtpModal}>
                                Done
                            </Button>
                        </div>
                    )}
                </Modal>
            </div>
        </RoleGuard>
    );
}
