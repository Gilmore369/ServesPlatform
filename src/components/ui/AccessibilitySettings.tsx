'use client';

import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { Button } from './button';
import { useAccessibility } from '@/lib/contexts/AccessibilityContext';
import {
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySettings({ isOpen, onClose }: AccessibilitySettingsProps) {
  const {
    prefersReducedMotion,
    prefersHighContrast,
    keyboardNavigationMode,
    setKeyboardNavigationMode,
    fontSize,
    setFontSize,
    announceMessage,
  } = useAccessibility();

  const handleFontSizeChange = (size: 'normal' | 'large' | 'larger') => {
    setFontSize(size);
    announceMessage(`Tamaño de fuente cambiado a ${size === 'normal' ? 'normal' : size === 'large' ? 'grande' : 'muy grande'}`);
  };

  const handleKeyboardModeToggle = () => {
    const newMode = !keyboardNavigationMode;
    setKeyboardNavigationMode(newMode);
    announceMessage(`Modo de navegación por teclado ${newMode ? 'activado' : 'desactivado'}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Accesibilidad"
      size="md"
    >
      <ModalBody>
        <div className="space-y-6">
          {/* Font Size Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <EyeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Tamaño de Texto
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="fontSize"
                  value="normal"
                  checked={fontSize === 'normal'}
                  onChange={() => handleFontSizeChange('normal')}
                  className="mr-3 focus:ring-2 focus:ring-blue-500"
                />
                <span>Normal</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="fontSize"
                  value="large"
                  checked={fontSize === 'large'}
                  onChange={() => handleFontSizeChange('large')}
                  className="mr-3 focus:ring-2 focus:ring-blue-500"
                />
                <span>Grande</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="fontSize"
                  value="larger"
                  checked={fontSize === 'larger'}
                  onChange={() => handleFontSizeChange('larger')}
                  className="mr-3 focus:ring-2 focus:ring-blue-500"
                />
                <span>Muy Grande</span>
              </label>
            </div>
          </div>

          {/* Keyboard Navigation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <ComputerDesktopIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Navegación por Teclado
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={keyboardNavigationMode}
                onChange={handleKeyboardModeToggle}
                className="mr-3 focus:ring-2 focus:ring-blue-500"
              />
              <span>Activar indicadores de navegación por teclado</span>
            </label>
            <p className="text-sm text-gray-600 mt-2">
              Muestra indicadores visuales mejorados cuando navegas con el teclado
            </p>
          </div>

          {/* System Preferences (Read-only) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Preferencias del Sistema
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Movimiento reducido:</span>
                <span className={prefersReducedMotion ? 'text-green-600' : 'text-gray-500'}>
                  {prefersReducedMotion ? 'Activado' : 'Desactivado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Alto contraste:</span>
                <span className={prefersHighContrast ? 'text-green-600' : 'text-gray-500'}>
                  {prefersHighContrast ? 'Activado' : 'Desactivado'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Estas preferencias se detectan automáticamente desde la configuración de tu sistema operativo
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Atajos de Teclado Disponibles
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+M</kbd>
                  <span>Alternar menú</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+/</kbd>
                  <span>Buscar</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Alt+1</kbd>
                  <span>Ir al contenido</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Alt+2</kbd>
                  <span>Ir a navegación</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Esc</kbd>
                  <span>Cerrar modales</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Tab</kbd>
                  <span>Navegar elementos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="outline">
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Hook for opening accessibility settings
export function useAccessibilitySettings() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    AccessibilitySettingsModal: () => (
      <AccessibilitySettings isOpen={isOpen} onClose={close} />
    ),
  };
}