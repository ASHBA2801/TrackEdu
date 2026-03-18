'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, PageHeader, Modal, ConfirmationModal, Input } from '@/components/ui';
import Link from 'next/link';

/**
 * HOD On-Duty Permission Page
 * 
 * Features:
 * - View all OD permissions (active/revoked)
 * - Grant new OD permission to students
 * - Revoke active permissions
 */

interface ODPermission {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'ACTIVE' | 'REVOKED';
    createdAt: string;
    revokedAt: string | null;
}

interface Student {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
}

export default function OnDutyPage() {
    const [permissions, setPermissions] = useState<ODPermission[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'REVOKED'>('ACTIVE');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<ODPermission | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        studentId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Message state
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/hod/on-duty?status=${filter}`);
            const data = await res.json();

            if (data.success) {
                setPermissions(data.data.permissions);
                setStudents(data.data.students);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGrantOD = async () => {
        setFormError('');

        if (!formData.studentId || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
            setFormError('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/hod/on-duty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to grant OD permission');
            }

            setMessage({ type: 'success', text: 'On-Duty permission granted successfully!' });
            setShowAddModal(false);
            setFormData({ studentId: '', startDate: '', endDate: '', reason: '' });
            fetchData();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevokeOD = async () => {
        if (!selectedPermission) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/hod/on-duty/${selectedPermission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to revoke permission');
            }

            setMessage({ type: 'success', text: 'On-Duty permission revoked!' });
            setShowRevokeModal(false);
            setSelectedPermission(null);
            fetchData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openRevokeModal = (permission: ODPermission) => {
        setSelectedPermission(permission);
        setShowRevokeModal(true);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const isActive = (permission: ODPermission) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(permission.endDate);
        return permission.status === 'ACTIVE' && end >= today;
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
                        title="On-Duty Permissions"
                        subtitle="Grant and manage on-duty permissions for students"
                    >
                        <Button variant="primary" onClick={() => setShowAddModal(true)}>
                            + Grant OD Permission
                        </Button>
                    </PageHeader>

                    {/* Message */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['ACTIVE', 'REVOKED', 'all'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : permissions.length === 0 ? (
                        <Card>
                            <div className="text-center py-12 text-gray-500">
                                <p className="mb-4">No on-duty permissions found.</p>
                                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                                    Grant First Permission
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {permissions.map(permission => (
                                            <tr key={permission.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="text-sm font-medium text-gray-800">{permission.studentName}</div>
                                                    <div className="text-xs text-gray-500">{permission.studentEmail}</div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {permission.rollNumber}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {formatDate(permission.startDate)} - {formatDate(permission.endDate)}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {permission.reason}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${permission.status === 'ACTIVE'
                                                            ? isActive(permission)
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {permission.status === 'ACTIVE'
                                                            ? isActive(permission) ? 'Active' : 'Expired'
                                                            : 'Revoked'
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {permission.status === 'ACTIVE' && (
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => openRevokeModal(permission)}
                                                        >
                                                            Revoke
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </main>

                {/* Grant OD Modal */}
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Grant On-Duty Permission"
                    size="md"
                >
                    <div className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {formError}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                            <select
                                value={formData.studentId}
                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a student</option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.rollNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Enter reason for on-duty permission..."
                            />
                        </div>

                        <p className="text-xs text-gray-500">
                            Students with active OD permission will be marked as &quot;ON_DUTY&quot; instead of &quot;ABSENT&quot; for sessions during this period.
                        </p>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleGrantOD}
                                isLoading={isSubmitting}
                            >
                                Grant Permission
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Revoke Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showRevokeModal}
                    onClose={() => setShowRevokeModal(false)}
                    onConfirm={handleRevokeOD}
                    title="Revoke OD Permission"
                    description={`Are you sure you want to revoke the on-duty permission for ${selectedPermission?.studentName}? This action cannot be undone.`}
                    confirmText="Revoke"
                    variant="danger"
                    isLoading={isSubmitting}
                />
            </div>
        </RoleGuard>
    );
}
