'use client';

import React from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      showCloseButton={false}
    >
      <ModalBody>
        <div className="sm:flex sm:items-start">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {message}
              </p>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleConfirm}
          className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmButton}`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Procesando...
            </div>
          ) : (
            confirmText
          )}
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [dialog, setDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [isLoading, setIsLoading] = React.useState(false);

  const showConfirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
  }) => {
    setDialog({
      isOpen: true,
      ...options,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await options.onConfirm();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Confirm action failed:', error);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const hideConfirm = () => {
    if (!isLoading) {
      setDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={dialog.isOpen}
      onClose={hideConfirm}
      onConfirm={dialog.onConfirm}
      title={dialog.title}
      message={dialog.message}
      type={dialog.type}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      isLoading={isLoading}
    />
  );

  return {
    showConfirm,
    hideConfirm,
    ConfirmDialog: ConfirmDialogComponent,
    isLoading,
  };
}