'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button } from '@/components/ui';

type LeaveRequest = {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    leaveDate: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
};

export default function HODLeavesPage() {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
    const [processing, setProcessing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        try {
            const url = filter === 'ALL' ? '/api/hod/leaves' : `/api/hod/leaves?status=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setLeaves(data.data);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/hod/leaves/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: `Leave request ${status.toLowerCase()}` });
                fetchLeaves();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to process request' });
        } finally {
            setProcessing(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700',
        };
        return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
    };

    return (
        <RoleGuard allowedRoles={['HOD']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Leave Requests" />

                <main className="p-6 max-w-7xl mx-auto">
                    {message && (
                        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === status
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <Card>
                        {loading ? (
                            <div className="py-8 text-center text-gray-500">Loading...</div>
                        ) : leaves.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Leave Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Submitted</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leaves.map(leave => (
                                            <tr key={leave.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-gray-800">{leave.studentName}</div>
                                                    <div className="text-sm text-gray-500">{leave.studentEmail}</div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">{leave.rollNumber}</td>
                                                <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                                    {new Date(leave.leaveDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {leave.reason}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(leave.status)}`}>
                                                        {leave.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-500">
                                                    {new Date(leave.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {leave.status === 'PENDING' ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                onClick={() => handleAction(leave.id, 'APPROVED')}
                                                                isLoading={processing === leave.id}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => handleAction(leave.id, 'REJECTED')}
                                                                isLoading={processing === leave.id}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">
                                                            {leave.reviewedBy && `By ${leave.reviewedBy}`}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                No {filter.toLowerCase()} leave requests
                            </p>
                        )}
                    </Card>
                </main>
            </div>
        </RoleGuard>
    );
}
