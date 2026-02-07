import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FormFieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
    helpText?: string;
}

/**
 * Wrapper component for form inputs with consistent label, error, and help text styling
 */
export function FormField({ label, error, required, children, className = '', helpText }: FormFieldProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {helpText && !error && (
                <p className="text-xs text-gray-500">{helpText}</p>
            )}
            {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    helpText?: string;
}

/**
 * Combined FormField + Input for convenience
 */
export function FormInput({ label, error, required, helpText, className = '', ...inputProps }: FormInputProps) {
    return (
        <FormField label={label} error={error} required={required} helpText={helpText} className={className}>
            <input
                {...inputProps}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    } ${inputProps.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
        </FormField>
    );
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    helpText?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

/**
 * Combined FormField + Select for convenience
 */
export function FormSelect({ label, error, required, helpText, options, placeholder, className = '', ...selectProps }: FormSelectProps) {
    return (
        <FormField label={label} error={error} required={required} helpText={helpText} className={className}>
            <select
                {...selectProps}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    } ${selectProps.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </FormField>
    );
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    helpText?: string;
}

/**
 * Combined FormField + Textarea for convenience
 */
export function FormTextarea({ label, error, required, helpText, className = '', ...textareaProps }: FormTextareaProps) {
    return (
        <FormField label={label} error={error} required={required} helpText={helpText} className={className}>
            <textarea
                {...textareaProps}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    } ${textareaProps.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
        </FormField>
    );
}
