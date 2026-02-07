'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode; // For action buttons
    className?: string;
}

/**
 * Standardized page header component for consistent layout across portals
 * Usage: <PageHeader title="Dashboard" subtitle="Overview">
 *          <Button>Add New</Button>
 *        </PageHeader>
 */
export function PageHeader({ title, subtitle, children, className = '' }: PageHeaderProps) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
