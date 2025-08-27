/**
 * Activity completion button with business rule validation
 * Demonstrates requirement 3.4: Activity completion requires checklist OK and at least 1 evidence
 */

import React, { useState } from 'react';
import { Activity, ActivityChecklist, Evidence } from '@/lib/types';
import { useActivityCompletionValidation } from '@/lib/hooks/useBusinessRules';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ActivityCompletionButtonProps {
  activity: Activity;
  checklist?: ActivityChecklist;
  evidence?: Evidence[];
  onComplete: (activityId: string) => Promise<void>;
  disabled?: boolean;
}

export function ActivityCompletionButton({
  activity,
  checklist,
  evidence,
  onComplete,
  disabled = false
}: ActivityCompletionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validate activity completion using business rules
  const completionValidation = useActivityCompletionValidation(
    activity,
    checklist,
    evidence
  );

  const canComplete = activity.estado !== 'Completada' && completionValidation.isValid;

  const handleComplete = async () => {
    if (!canComplete) return;

    setLoading(true);
    try {
      await onComplete(activity.id);
      setShowConfirm(false);
    } catch (error) {
      console.error('Error completing activity:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if activity is already completed
  if (activity.estado === 'Completada') {
    return (
      <div className="flex items-center text-green-600">
        <CheckCircleIcon className="h-5 w-5 mr-2" />
        <span className="text-sm font-medium">Completada</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Validation feedback */}
        <ValidationAlert validation={completionValidation} />

        {/* Completion button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={disabled || !canComplete || loading}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
            ${canComplete
              ? 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
          `}
          title={
            !canComplete 
              ? 'Complete los requisitos antes de marcar como completada'
              : 'Marcar actividad como completada'
          }
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Completando...
            </>
          ) : (
            <>
              {canComplete ? (
                <CheckCircleIcon className="h-4 w-4 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              )}
              Completar Actividad
            </>
          )}
        </button>

        {/* Requirements summary */}
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-medium">Requisitos para completar:</div>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              checklist?.completado ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            Checklist completado {checklist?.completado ? '✓' : '✗'}
          </div>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              evidence && evidence.length > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            Al menos 1 evidencia {evidence && evidence.length > 0 ? `(${evidence.length})` : '(0)'} ✓
          </div>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              activity.porcentaje_avance === 100 ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            Progreso: {activity.porcentaje_avance}%
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleComplete}
        title="Completar Actividad"
        message={
          <div className="space-y-3">
            <p>¿Está seguro de que desea marcar esta actividad como completada?</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-2">Actividad: {activity.titulo}</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>• Checklist: {checklist?.completado ? 'Completado' : 'Pendiente'}</div>
                <div>• Evidencias: {evidence?.length || 0} registradas</div>
                <div>• Progreso: {activity.porcentaje_avance}%</div>
              </div>
            </div>
            {completionValidation.warnings && completionValidation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">Advertencias:</div>
                  <ul className="list-disc list-inside">
                    {completionValidation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        }
        confirmText="Completar"
        cancelText="Cancelar"
        type="success"
      />
    </>
  );
}