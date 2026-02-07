'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';

/**
 * Student OTP Verification Page
 * 
 * Students must verify OTP (given by HOD) before accessing dashboard.
 * This is the second factor after password login.
 */

export default function VerifyOtpPage() {
    const router = useRouter();
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleVerify = async () => {
        setError('');

        if (!otp || otp.length !== 6) {
            setError('Please enter a 6-character OTP');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/student/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: otp.toUpperCase() })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            setSuccess(true);

            // Redirect to dashboard after brief success message
            setTimeout(() => {
                router.push('/dashboard/student');
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length <= 6) {
            setOtp(value);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <Header title="OTP Verification" />

            <main className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100vh - 73px)' }}>
                <Card className="w-full max-w-md p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verified!</h2>
                            <p className="text-gray-600">Redirecting to your dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800 mb-2">Enter OTP</h1>
                                <p className="text-gray-600 text-sm">
                                    Please enter the 6-character OTP provided by your Head of Department to access your dashboard.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    OTP Code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={handleOtpChange}
                                    placeholder="ABC123"
                                    className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                                    maxLength={6}
                                    autoFocus
                                />
                                <p className="mt-2 text-xs text-gray-500 text-center">
                                    OTP is valid for 60 seconds. Maximum 5 attempts.
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={handleVerify}
                                isLoading={isLoading}
                                disabled={otp.length !== 6}
                            >
                                Verify OTP
                            </Button>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-500">
                                    Don't have an OTP?{' '}
                                    <span className="text-gray-700">
                                        Contact your HOD to generate one for you.
                                    </span>
                                </p>
                            </div>
                        </>
                    )}
                </Card>
            </main>
        </div>
    );
}
