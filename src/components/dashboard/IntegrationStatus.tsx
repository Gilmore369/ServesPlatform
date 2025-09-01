"use client";

import React, { useState, useEffect } from 'react';

interface IntegrationStatusProps {
  metrics: {
    activeProjects: number;
    activePersonnel: number;
    pendingTasks: number;
    remainingBudget: number;
  };
}

const IntegrationStatus: React.FC<IntegrationStatusProps> = ({ metrics }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Check if we're getting mock data (the default fallback values)
  const isMockData = 
    metrics.activeProjects === 8 && 
    metrics.activePersonnel === 24 && 
    metrics.pendingTasks === 12 && 
    metrics.remainingBudget === 250000;

  const isRealData = !isMockData;

  if (!isVisible) return null;

  return (
    <div className={`mb-6 p-4 rounded-lg border ${
      isRealData 
        ? 'bg-green-50 border-green-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            isRealData ? 'bg-green-500' : 'bg-yellow-500'
          }`}>
            {isRealData ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${
              isRealData ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {isRealData ? '✅ Conectado a Google Sheets' : '⚠️ Usando Datos de Prueba'}
            </h3>
            
            <p className={`text-sm mt-1 ${
              isRealData ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {isRealData ? (
                'Los datos del dashboard provienen directamente de Google Sheets y se actualizan en tiempo real.'
              ) : (
                'El dashboard está mostrando datos de prueba. Para ver datos reales, asegúrate de hacer redeploy del Google Apps Script con los cambios actualizados.'
              )}
            </p>
            
            {!isRealData && (
              <div className="mt-2 text-xs text-yellow-600">
                <p><strong>Pasos para activar datos reales:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Copia el código actualizado de <code>google-apps-script/Code.gs</code></li>
                  <li>Pégalo en tu Google Apps Script</li>
                  <li>Guarda y despliega una nueva versión</li>
                  <li>Recarga esta página</li>
                </ol>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-600">
              <strong>Valores actuales:</strong> Proyectos: {metrics.activeProjects}, Personal: {metrics.activePersonnel}, Tareas: {metrics.pendingTasks}, Presupuesto: S/ {metrics.remainingBudget.toLocaleString()}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default IntegrationStatus;