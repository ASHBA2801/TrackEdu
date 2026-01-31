import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'stat' | 'profile';
    title?: string;
    subtitle?: string;
}

export function Card({
    children,
    className = '',
    variant = 'default',
    title,
    subtitle
}: CardProps) {
    const baseStyles = 'bg-white rounded-xl shadow-md overflow-hidden';

    const variantStyles = {
        default: 'p-6',
        stat: 'p-6 text-center',
        profile: 'p-6 flex flex-col items-center',
    };

    return (
        <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
            {title && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    className = ''
}: StatCardProps) {
    const trendColors = {
        up: 'text-green-500',
        down: 'text-red-500',
        neutral: 'text-gray-500',
    };

    return (
        <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                {icon && <span className="text-gray-400">{icon}</span>}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{value}</span>
                {trend && (
                    <span className={trendColors[trend]}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                    </span>
                )}
            </div>
            {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
        </div>
    );
}

interface ProfileCardProps {
    name: string;
    subtitle: string;
    avatar?: string;
    details: { label: string; value: string }[];
    className?: string;
}

export function ProfileCard({
    name,
    subtitle,
    avatar,
    details,
    className = ''
}: ProfileCardProps) {
    return (
        <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {avatar || name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{name}</h3>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {details.map((detail, index) => (
                    <div key={index}>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            {detail.label}
                        </p>
                        <p className="text-sm font-semibold text-gray-700">{detail.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
