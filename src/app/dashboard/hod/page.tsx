'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, StatCard, Button } from '@/components/ui';
import Link from 'next/link';

type HODProfile = {
    id: string;
    name: string;
    email: string;
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    stats: {
        students: number;
        faculty: number;
        classrooms: number;
        pendingLeaves: number;
    };
};

type LeaveRequest = {
    id: string;
    studentName: string;
    leaveDate: string;
    reason: string;
    status: string;
    createdAt: string;
};

export default function HODDashboard() {
    const [profile, setProfile] = useState<HODProfile | null>(null);
    const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [profileRes, leavesRes] = await Promise.all([
                fetch('/api/hod/me'),
                fetch('/api/hod/leaves?status=PENDING'),
            ]);

            const profileData = await profileRes.json();
            const leavesData = await leavesRes.json();

            if (profileData.success) setProfile(profileData.data);
            if (leavesData.success) setRecentLeaves(leavesData.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="HOD Dashboard" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Profile Card */}
                    <Card className="mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                                {profile?.name.charAt(0) || 'H'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{profile?.name}</h2>
                                <p className="text-sm text-gray-500">
                                    Head of Department • {profile?.departmentName} ({profile?.departmentCode})
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Total Students"
                            value={profile?.stats.students || 0}
                            subtitle="In department"
                        />
                        <StatCard
                            title="Faculty Members"
                            value={profile?.stats.faculty || 0}
                            subtitle="Active"
                        />
                        <StatCard
                            title="Classrooms"
                            value={profile?.stats.classrooms || 0}
                            subtitle="Created"
                        />
                        <StatCard
                            title="Pending Leaves"
                            value={profile?.stats.pendingLeaves || 0}
                            subtitle="Awaiting approval"
                            trend={profile?.stats.pendingLeaves && profile.stats.pendingLeaves > 0 ? 'up' : 'neutral'}
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card title="Quick Actions">
                            <div className="grid grid-cols-2 gap-4">
                                <Link href="/dashboard/hod/attendance">
                                    <Button variant="primary" className="w-full">
                                        View Attendance
                                    </Button>
                                </Link>
                                <Link href="/dashboard/hod/classrooms">
                                    <Button variant="secondary" className="w-full">
                                        Manage Classrooms
                                    </Button>
                                </Link>
                                <Link href="/dashboard/hod/leaves">
                                    <Button variant="secondary" className="w-full">
                                        Leave Requests
                                    </Button>
                                </Link>
                                <Link href="/dashboard/hod/subjects">
                                    <Button variant="secondary" className="w-full">
                                        Subject Assignment
                                    </Button>
                                </Link>
                                <Link href="/dashboard/hod/on-duty">
                                    <Button variant="secondary" className="w-full">
                                        On-Duty Permissions
                                    </Button>
                                </Link>
                                <Link href="/dashboard/hod/otp">
                                    <Button variant="primary" className="w-full">
                                        Generate OTP
                                    </Button>
                                </Link>
                            </div>
                        </Card>

                        <Card title="Pending Leave Requests">
                            {recentLeaves.length > 0 ? (
                                <div className="space-y-3">
                                    {recentLeaves.map(leave => (
                                        <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-800">{leave.studentName}</p>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(leave.leaveDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Link href="/dashboard/hod/leaves">
                                                <Button size="sm" variant="ghost">Review</Button>
                                            </Link>
                                        </div>
                                    ))}
                                    <Link href="/dashboard/hod/leaves" className="block text-center text-blue-600 text-sm hover:underline mt-2">
                                        View all requests →
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No pending leave requests</p>
                            )}
                        </Card>
                    </div>
                </main>
            </div>
        </RoleGuard>
    );
}
