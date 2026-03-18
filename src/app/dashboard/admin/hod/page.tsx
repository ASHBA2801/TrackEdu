'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header, RoleGuard } from '@/components/layout';
import { Card, Button, Input, Select, ConfirmationModal, Modal, PageHeader, DataTable } from '@/components/ui';
import Link from 'next/link';

/**
 * Admin HOD Management Page
 * 
 * Features:
 * - List all HODs with department info
 * - Create new HOD with temp password generation
 * - Edit HOD department assignment
 * - Disable/Delete HOD
 * 
 * Assumption: This page is only accessible by ADMIN role (middleware enforced)
 */

interface HOD {
    id: string;
    userId: string;
    name: string;
    email: string;
    departmentId: string;
    departmentName: string;
    departmentCode?: string;
    isActive: boolean;
    createdAt: string;
}

interface Department {
    id: string;
    name: string;
    code: string;
}

export default function HODManagementPage() {
    const [hods, setHods] = useState<HOD[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedHod, setSelectedHod] = useState<HOD | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        departmentId: '',
        generateTempPassword: true
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

    // Message state
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [hodRes, deptRes] = await Promise.all([
                fetch('/api/admin/hod'),
                fetch('/api/departments')
            ]);

            const hodData = await hodRes.json();
            const deptData = await deptRes.json();

            if (hodData.success) setHods(hodData.data);
            if (deptData.success) setDepartments(deptData.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddHod = async () => {
        setFormError('');

        if (!formData.name || !formData.email || !formData.departmentId) {
            setFormError('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/hod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create HOD');
            }

            // Show generated password
            if (data.data?.generatedPassword) {
                setGeneratedPassword(data.data.generatedPassword);
            }

            setMessage({ type: 'success', text: 'HOD created successfully!' });
            fetchData();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateHod = async () => {
        if (!selectedHod) return;
        setFormError('');

        if (!formData.departmentId) {
            setFormError('Please select a department');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/hod/${selectedHod.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ departmentId: formData.departmentId })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update HOD');
            }

            setMessage({ type: 'success', text: 'HOD updated successfully!' });
            setShowEditModal(false);
            fetchData();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHod = async () => {
        if (!selectedHod) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/hod/${selectedHod.id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete HOD');
            }

            setMessage({ type: 'success', text: 'HOD deleted successfully!' });
            setShowDeleteModal(false);
            setSelectedHod(null);
            fetchData();
        } catch (err: unknown) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An unknown error occurred' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (hod: HOD) => {
        try {
            const res = await fetch(`/api/admin/hod/${hod.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !hod.isActive })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update status');
            }

            setMessage({ type: 'success', text: `HOD ${hod.isActive ? 'disabled' : 'enabled'} successfully!` });
            fetchData();
        } catch (err: unknown) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An unknown error occurred' });
        }
    };

    const openAddModal = () => {
        setFormData({ name: '', email: '', departmentId: '', generateTempPassword: true });
        setFormError('');
        setGeneratedPassword(null);
        setShowAddModal(true);
    };

    const openEditModal = (hod: HOD) => {
        setSelectedHod(hod);
        setFormData({ name: hod.name, email: hod.email, departmentId: hod.departmentId, generateTempPassword: false });
        setFormError('');
        setShowEditModal(true);
    };

    const openDeleteModal = (hod: HOD) => {
        setSelectedHod(hod);
        setShowDeleteModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setGeneratedPassword(null);
        setFormData({ name: '', email: '', departmentId: '', generateTempPassword: true });
    };

    // Filter HODs by search
    const filteredHods = hods.filter(hod =>
        hod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hod.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hod.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'email', header: 'Email', sortable: true },
        { key: 'departmentName', header: 'Department', sortable: true },
        {
            key: 'isActive',
            header: 'Status',
            render: (hod: HOD) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${hod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {hod.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (hod: HOD) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(hod)}>
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant={hod.isActive ? 'secondary' : 'primary'}
                        onClick={() => handleToggleStatus(hod)}
                    >
                        {hod.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openDeleteModal(hod)}>
                        Delete
                    </Button>
                </div>
            )
        }
    ];

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="min-h-screen bg-gray-50">
                <Header title="Admin Dashboard" />

                <main className="p-6 max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-4">
                        <Link href="/dashboard/admin" className="text-sm text-blue-600 hover:underline">
                            ← Back to Dashboard
                        </Link>
                    </div>

                    {/* Page Header */}
                    <PageHeader
                        title="HOD Management"
                        subtitle="Create and manage Head of Department accounts"
                    >
                        <Button variant="primary" onClick={openAddModal}>
                            + Add HOD
                        </Button>
                    </PageHeader>

                    {/* Message */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Search */}
                    <div className="mb-6">
                        <Input
                            placeholder="Search by name, email, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-md"
                        />
                    </div>

                    {/* HOD Table */}
                    <Card>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredHods.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                    No HODs found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHods.map(hod => (
                                                <tr key={hod.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-4 text-sm font-medium text-gray-800">{hod.name}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">{hod.email}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">{hod.departmentName}</td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${hod.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {hod.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="ghost" onClick={() => openEditModal(hod)}>
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={hod.isActive ? 'secondary' : 'primary'}
                                                                onClick={() => handleToggleStatus(hod)}
                                                            >
                                                                {hod.isActive ? 'Disable' : 'Enable'}
                                                            </Button>
                                                            <Button size="sm" variant="danger" onClick={() => openDeleteModal(hod)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </main>

                {/* Add HOD Modal */}
                <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add New HOD" size="md">
                    {generatedPassword ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">HOD Created Successfully!</h4>
                                <p className="text-sm text-green-700 mb-3">
                                    Please copy this password immediately. It will not be shown again.
                                </p>
                                <div className="bg-white p-3 rounded border border-green-300 font-mono text-lg text-center select-all cursor-text">
                                    {generatedPassword}
                                </div>
                            </div>
                            <Button variant="primary" className="w-full" onClick={closeAddModal}>
                                Done
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Enter email address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                <Select
                                    options={departments.map(d => ({ value: d.id, label: `${d.name} (${d.code})` }))}
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="generateTempPassword"
                                    checked={formData.generateTempPassword}
                                    onChange={(e) => setFormData({ ...formData, generateTempPassword: e.target.checked })}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="generateTempPassword" className="text-sm text-gray-700">
                                    Generate temporary password
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                HOD will be required to change password on first login.
                            </p>
                            <div className="flex gap-3 pt-4">
                                <Button variant="secondary" className="flex-1" onClick={closeAddModal}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleAddHod}
                                    isLoading={isSubmitting}
                                >
                                    Create HOD
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Edit HOD Modal */}
                <Modal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title="Edit HOD"
                    size="md"
                >
                    <div className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                {formError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <Input value={selectedHod?.name || ''} disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <Input value={selectedHod?.email || ''} disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                            <Select
                                options={departments.map(d => ({ value: d.id, label: `${d.name} (${d.code})` }))}
                                value={formData.departmentId}
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleUpdateHod}
                                isLoading={isSubmitting}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteHod}
                    title="Delete HOD"
                    description={`Are you sure you want to delete ${selectedHod?.name}? This action cannot be undone.`}
                    confirmText="Delete"
                    variant="danger"
                    isLoading={isSubmitting}
                />
            </div>
        </RoleGuard>
    );
}
