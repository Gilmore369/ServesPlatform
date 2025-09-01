'use client';

import React from 'react';
import { isDevelopmentMode } from '../lib/development-mode';

/**
 * Development Banner Component
 * Shows a banner when running in development mode to indicate mock data usage
 */
export const DevelopmentBanner: React.FC = () => {
  // Only show in development mode
  if (!isDevelopmentMode()) {
    return null;
  }

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-lg">🎭</span>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            Modo de Desarrollo Activo
          </p>
          <p className="text-xs mt-1">
            Usando datos de prueba para evitar errores de CORS con Google Sheets. 
            Los datos reales se cargarán en producción.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentBanner;