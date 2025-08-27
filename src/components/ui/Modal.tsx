'use client';

import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useFocusTrap } from '@/lib/hooks/useAccessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm sm:max-w-md',
  md: 'max-w-md sm:max-w-lg',
  lg: 'max-w-lg sm:max-w-2xl',
  xl: 'max-w-xl sm:max-w-4xl',
  full: 'max-w-full sm:max-w-7xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Focus management and accessibility
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Set focus to modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('aria-hidden', 'true');
    } else {
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      
      // Restore body scroll
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('aria-hidden');
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('aria-hidden');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="flex items-end sm:items-center justify-center min-h-screen pt-4 px-3 sm:px-4 pb-4 sm:pb-20 text-center sm:block sm:p-0"
        onClick={handleOverlayClick}
      >
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        {/* Modal panel */}
        <div
          ref={(node) => {
            if (modalRef.current !== node) modalRef.current = node;
            if (focusTrapRef.current !== node) focusTrapRef.current = node as HTMLElement;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby="modal-content"
          tabIndex={-1}
          className={`inline-block align-bottom bg-white rounded-t-lg sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="bg-white px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {title && (
                  <h3 id="modal-title" className="text-base sm:text-lg leading-6 font-medium text-gray-900 truncate pr-2">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 p-1 touch-manipulation"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div id="modal-content" className="bg-white px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-4 max-h-[70vh] sm:max-h-none overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal footer component for consistent styling
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row-reverse gap-2 sm:gap-3 ${className}`}>
      {children}
    </div>
  );
}

// Modal body component for consistent styling
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`px-4 py-4 sm:px-6 sm:py-5 ${className}`}>
      {children}
    </div>
  );
}