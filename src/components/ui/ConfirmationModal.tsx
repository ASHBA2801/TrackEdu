import { Fragment, useRef } from 'react';
import { Button } from './Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmationModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                ref={modalRef}
                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            {variant === 'danger' ? (
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                            )}
                        </div>
                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                            <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full sm:w-auto sm:ml-3"
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="mt-3 w-full sm:mt-0 sm:w-auto"
                    >
                        {cancelText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
