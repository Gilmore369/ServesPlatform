'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { CogIcon, ClockIcon, CurrencyDollarIcon, HashtagIcon } from '@heroicons/react/24/outline';

interface SystemConfig {
  id?: string;
  timezone: string;
  default_currency: 'PEN' | 'USD';
  project_code_format: string;
  activity_code_format: string;
  default_sla_hours: number;
  backup_frequency_days: number;
  session_timeout_minutes: number;
  max_file_size_mb: number;
  created_at?: Date;
  updated_at?: Date;
}

const defaultConfig: SystemConfig = {
  timezone: 'America/Lima',
  default_currency: 'PEN',
  project_code_format: 'PRJ-{YYYY}-{###}',
  activity_code_format: 'ACT-{###}',
  default_sla_hours: 168, // 7 days
  backup_frequency_days: 7,
  session_timeout_minutes: 480, // 8 hours
  max_file_size_mb: 10,
};

export function SystemConfiguration() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load existing config
      const response = await apiClient.list<SystemConfig>('ConfiguracionSistema', { limit: 1 });
      
      if (response.ok && response.data && response.data.length > 0) {
        setConfig(response.data[0]);
      } else {
        // Use default config if none exists
        setConfig(defaultConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      if (config.id) {
        response = await apiClient.update('ConfiguracionSistema', config.id, config);
      } else {
        response = await apiClient.create('ConfiguracionSistema', config);
      }

      if (response.ok) {
        setSuccess('Configuración guardada exitosamente');
        if (response.data) {
          setConfig(response.data as SystemConfig);
        }
      } else {
        setError(response.message || 'Error al guardar configuración');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SystemConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSuccess(null); // Clear success message when editing
  };

  const timezones = [
    { value: 'America/Lima', label: 'Lima (UTC-5)' },
    { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
    { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
    { value: 'America/New_York', label: 'Nueva York (UTC-5/-4)' },
    { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="mt-1 text-gray-600">
          Configura los parámetros generales del sistema
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <CogIcon className="h-5 w-5 mr-2" />
            Configuración General
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Timezone Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              Zona Horaria
            </label>
            <select
              value={config.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
              Moneda por Defecto
            </label>
            <select
              value={config.default_currency}
              onChange={(e) => handleInputChange('default_currency', e.target.value as 'PEN' | 'USD')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="PEN">Soles Peruanos (PEN)</option>
              <option value="USD">Dólares Americanos (USD)</option>
            </select>
          </div>

          {/* Code Formats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HashtagIcon className="h-4 w-4 inline mr-1" />
                Formato Código Proyecto
              </label>
              <input
                type="text"
                value={config.project_code_format}
                onChange={(e) => handleInputChange('project_code_format', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="PRJ-{YYYY}-{###}"
              />
              <p className="mt-1 text-xs text-gray-500">
                Usa {'{YYYY}'} para año, {'{###}'} para número secuencial
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HashtagIcon className="h-4 w-4 inline mr-1" />
                Formato Código Actividad
              </label>
              <input
                type="text"
                value={config.activity_code_format}
                onChange={(e) => handleInputChange('activity_code_format', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="ACT-{###}"
              />
              <p className="mt-1 text-xs text-gray-500">
                Usa {'{###}'} para número secuencial
              </p>
            </div>
          </div>

          {/* Operational Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SLA por Defecto (horas)
              </label>
              <input
                type="number"
                min="1"
                value={config.default_sla_hours}
                onChange={(e) => handleInputChange('default_sla_hours', parseInt(e.target.value) || 168)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tiempo límite por defecto para actividades
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout de Sesión (minutos)
              </label>
              <input
                type="number"
                min="30"
                max="1440"
                value={config.session_timeout_minutes}
                onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value) || 480)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tiempo antes de cerrar sesión automáticamente
              </p>
            </div>
          </div>

          {/* System Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia de Respaldo (días)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.backup_frequency_days}
                onChange={(e) => handleInputChange('backup_frequency_days', parseInt(e.target.value) || 7)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cada cuántos días realizar respaldo automático
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño Máximo Archivo (MB)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.max_file_size_mb}
                onChange={(e) => handleInputChange('max_file_size_mb', parseInt(e.target.value) || 10)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tamaño máximo para archivos subidos
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}