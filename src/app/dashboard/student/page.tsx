'use client';

import { useEffect, useState } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { ProfileCard, StatCard, SimpleTable, Card } from '@/components/ui';
import {
    timetable,
} from '@/lib/mock-data';
import { useSession } from 'next-auth/react';
import { AttendanceSummary } from '@/types';
import QRScanner from '@/components/student/QRScanner';

export default function StudentDashboard() {
    const { data: session, status } = useSession();
    const [student, setStudent] = useState<any>(null);
    const [attendanceData, setAttendanceData] = useState<{
        subjects: AttendanceSummary[];
        overall: { totalClasses: number; attended: number; percentage: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Student Profile
                const profileRes = await fetch('/api/student/me');

                if (!profileRes.ok) {
                    console.error("Failed to fetch student profile");
                    setLoading(false);
                    return;
                }

                const profileData = await profileRes.json();

                if (profileData.success) {
                    setStudent(profileData.data);

                    // 2. Fetch Attendance (using real student ID)
                    const attendanceRes = await fetch(`/api/attendance?studentId=${profileData.data.id}&summary=true`);
                    const attendanceJson = await attendanceRes.json();

                    if (attendanceJson.success) {
                        setAttendanceData(attendanceJson.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchData();
        } else if (status === 'unauthenticated') {
            // Should be handled by RoleGuard, but just in case
            setLoading(false);
        }
    }, [status, session]);

    const getAttendanceColor = (percentage: number) => {
        if (percentage >= 75) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getAttendanceBg = (percentage: number) => {
        if (percentage >= 75) return 'bg-green-100';
        if (percentage >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <RoleGuard allowedRoles={['STUDENT']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Student Dashboard" />

                <main className="p-6 max-w-7xl mx-auto">
                    <div className="mb-8">
                        {/* QR Scanner - always show, pass studentId when available */}
                        <QRScanner studentId={student?.id || ''} />
                    </div>


                    {/* Profile and Stats Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Profile Card */}
                        {student && (
                            <ProfileCard
                                name={student.name}
                                subtitle={student.email}
                                details={[
                                    { label: 'Roll Number', value: student.rollNumber },
                                    { label: 'Department', value: student.departmentName || 'N/A' },
                                    { label: 'Year', value: `${student.year}${student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year` },
                                    { label: 'Section', value: `Section ${student.section}` },
                                ]}
                                className="lg:col-span-1"
                            />
                        )}

                        {/* Overall Attendance Card */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatCard
                                title="Overall Attendance"
                                value={`${attendanceData?.overall.percentage || 0}%`}
                                subtitle={`${attendanceData?.overall.attended || 0} of ${attendanceData?.overall.totalClasses || 0} classes`}
                                trend={
                                    attendanceData?.overall.percentage
                                        ? attendanceData.overall.percentage >= 75
                                            ? 'up'
                                            : attendanceData.overall.percentage >= 60
                                                ? 'neutral'
                                                : 'down'
                                        : 'neutral'
                                }
                            />
                            <StatCard
                                title="Total Subjects"
                                value={attendanceData?.subjects.length || 0}
                                subtitle="Currently enrolled"
                            />
                            <StatCard
                                title="Classes This Week"
                                value="-"
                                subtitle="Schedule integration pending"
                            />
                            <StatCard
                                title="Status"
                                value={
                                    attendanceData?.overall.percentage && attendanceData.overall.percentage >= 75
                                        ? 'Good'
                                        : attendanceData?.overall.percentage && attendanceData.overall.percentage >= 60
                                            ? 'Warning'
                                            : 'Critical'
                                }
                                subtitle={
                                    attendanceData?.overall.percentage && attendanceData.overall.percentage >= 75
                                        ? 'Keep it up!'
                                        : 'Improve attendance'
                                }
                            />
                        </div>
                    </div>

                    {/* Subject-wise Attendance */}
                    <Card title="Subject-wise Attendance" className="mb-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <SimpleTable
                                headers={['Subject', 'Code', 'Classes Held', 'Attended', 'Percentage']}
                                rows={
                                    attendanceData?.subjects.map(subject => [
                                        subject.subjectName,
                                        subject.subjectId,
                                        subject.totalClasses.toString(),
                                        subject.attended.toString(),
                                        <span
                                            key={subject.subjectId}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getAttendanceBg(subject.percentage)} ${getAttendanceColor(subject.percentage)}`}
                                        >
                                            {subject.percentage}%
                                        </span>,
                                    ]) || []
                                }
                            />
                        )}
                    </Card>

                    {/* Timetable */}
                    <Card title="Weekly Timetable">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Day
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 1
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 2
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 3
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Period 4
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {timetable.map((day, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                {day.day}
                                            </td>
                                            {day.periods.map((period, pIndex) => (
                                                <td key={pIndex} className="px-4 py-4">
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {period.subjectName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{period.time}</div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </main>
            </div>
        </RoleGuard>
    );
}
