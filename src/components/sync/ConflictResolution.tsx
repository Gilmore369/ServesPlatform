/**
 * Conflict Resolution Component
 * Handles data conflicts and provides resolution options
 */

'use client';

import React, { useState } from 'react';
import { ConflictData } from '@/hooks/useRealTimeSync';
import { AlertTriangle, Check, X, GitMerge, Clock, User } from 'lucide-react';

interface ConflictResolutionProps {
  conflicts: ConflictData[];
  onResolveConflict: (conflictId: string, resolution: 'accept_current' | 'accept_incoming' | 'merge') => void;
  onDismissConflict: (conflictId: string) => void;
  className?: string;
}

export function ConflictResolution({
  conflicts,
  onResolveConflict,
  onDismissConflict,
  className = ''
}: ConflictResolutionProps) {
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);

  if (conflicts.length === 0) {
    return null;
  }

  const handleResolveConflict = async (
    conflictId: string, 
    resolution: 'accept_current' | 'accept_incoming' | 'merge'
  ) => {
    setResolvingConflict(conflictId);
    try {
      await onResolveConflict(conflictId, resolution);
    } finally {
      setResolvingConflict(null);
    }
  };

  const getConflictTypeDescription = (type: string) => {
    switch (type) {
      case 'concurrent_edit':
        return 'Edición concurrente detectada';
      case 'version_mismatch':
        return 'Versiones no coinciden';
      case 'data_integrity':
        return 'Problema de integridad de datos';
      default:
        return 'Conflicto de datos';
    }
  };

  const getConflictSeverity = (type: string) => {
    switch (type) {
      case 'data_integrity':
        return 'critical';
      case 'version_mismatch':
        return 'high';
      case 'concurrent_edit':
        return 'medium';
      default:
        return 'medium';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold">
          Conflictos de Datos ({conflicts.length})
        </h3>
      </div>

      {/* Conflicts List */}
      <div className="space-y-3">
        {conflicts.map((conflict) => {
          const severity = getConflictSeverity(conflict.conflictType);
          const isExpanded = expandedConflict === conflict.id;
          const isResolving = resolvingConflict === conflict.id;

          return (
            <div
              key={conflict.id}
              className={`border-l-4 rounded-lg p-4 ${getSeverityColor(severity)}`}
            >
              {/* Conflict Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getConflictTypeDescription(conflict.conflictType)}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>Tabla: {conflict.table}</span>
                      <span>ID: {conflict.recordId}</span>
                      <span>Campo: {conflict.field}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(conflict.timestamp)}</span>
                  </div>
                  
                  <button
                    onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <GitMerge className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Conflict Details */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Conflict Details */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-3">
                      Detalles del Conflicto
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current Value */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-sm">Valor Actual</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                            {JSON.stringify(conflict.currentValue, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Incoming Value */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-sm">Valor Entrante</span>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                            {JSON.stringify(conflict.incomingValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Version Information */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <span>Versión Actual: {conflict.currentVersion}</span>
                      <span>Versión Entrante: {conflict.incomingVersion}</span>
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Selecciona una resolución para este conflicto:
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Accept Current */}
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'accept_current')}
                        disabled={isResolving}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mantener Actual</span>
                      </button>

                      {/* Accept Incoming */}
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'accept_incoming')}
                        disabled={isResolving}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Check className="w-3 h-3" />
                        <span>Aceptar Entrante</span>
                      </button>

                      {/* Merge (if applicable) */}
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'merge')}
                        disabled={isResolving}
                        className="flex items-center space-x-1 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <GitMerge className="w-3 h-3" />
                        <span>Fusionar</span>
                      </button>

                      {/* Dismiss */}
                      <button
                        onClick={() => onDismissConflict(conflict.id)}
                        disabled={isResolving}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <X className="w-3 h-3" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isResolving && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-gray-600">
                        Resolviendo conflicto...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Actions */}
      {conflicts.length > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {conflicts.length} conflictos pendientes
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                conflicts.forEach(conflict => {
                  onDismissConflict(conflict.id);
                });
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Descartar Todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}