'use client';

import { useState, useMemo, ReactNode } from 'react';
import { Button } from './Button';
import { Input } from './Input';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T, index: number) => ReactNode;
    className?: string;
    sortable?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    className?: string;
    emptyMessage?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: (keyof T)[];
    loading?: boolean;
    onRowClick?: (item: T) => void;
    pageSize?: number;
}

/**
 * Enhanced data table with search, sorting, and pagination
 */
export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    className = '',
    emptyMessage = 'No data available',
    searchable = false,
    searchPlaceholder = 'Search...',
    searchKeys = [],
    loading = false,
    onRowClick,
    pageSize = 10
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data by search
    const filteredData = useMemo(() => {
        if (!search || searchKeys.length === 0) return data;

        const searchLower = search.toLowerCase();
        return data.filter(item =>
            searchKeys.some(key => {
                const value = item[key];
                return value && String(value).toLowerCase().includes(searchLower);
            })
        );
    }, [data, search, searchKeys]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortKey as keyof T];
            const bVal = b[sortKey as keyof T];

            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return sortDir === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDir]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    // Reset to page 1 when search changes
    const handleSearch = (value: string) => {
        setSearch(value);
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-xl shadow-md p-8 ${className}`}>
                <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
            {/* Search bar */}
            {searchable && (
                <div className="p-4 border-b border-gray-200">
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                                        } ${column.className || ''}`}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortKey === String(column.key) && (
                                            <span className="text-blue-600">
                                                {sortDir === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {columns.map((column, colIndex) => (
                                        <td
                                            key={colIndex}
                                            className={`px-4 py-4 text-sm text-gray-700 ${column.className || ''}`}
                                        >
                                            {column.render
                                                ? column.render(item, rowIndex)
                                                : String(item[column.key as keyof T] ?? '-')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
