'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { User } from '@/lib/types';
import { auditLogger, AuditAction, ResourceType } from '@/lib/auditLog';

interface PasswordResetFormProps {
  user: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export function PasswordResetForm({ user, onSuccess, onCancel }: PasswordResetFormProps) {
  const [formData, setFormData] = useState<FormData>({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.newPassword) {
      errors.newPassword = 'La nueva contraseña es requerida';
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmar la contraseña es requerido';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.updateUser(user.id, {
        password: formData.newPassword,
      });

      if (response.ok) {
        // Log audit event for password reset
        await auditLogger.log(
          AuditAction.PASSWORD_RESET,
          ResourceType.USER,
          user.id,
          user.nombre,
          {
            metadata: { resetByAdmin: true }
          }
        );
        
        onSuccess();
      } else {
        setError(response.message || 'Error al resetear contraseña');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    setFormData({
      newPassword: password,
      confirmPassword: password,
    });
    
    // Clear any validation errors
    setValidationErrors({});
  };

  if (!user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
        <p className="text-sm">
          <strong>Usuario:</strong> {user.nombre} ({user.email})
        </p>
        <p className="text-sm mt-1">
          Se establecerá una nueva contraseña para este usuario.
        </p>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          Nueva Contraseña *
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="password"
            id="newPassword"
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            className={`flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
              validationErrors.newPassword ? 'border-red-300' : ''
            }`}
            disabled={loading}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={generateRandomPassword}
            className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            Generar
          </button>
        </div>
        {validationErrors.newPassword && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirmar Nueva Contraseña *
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.confirmPassword ? 'border-red-300' : ''
          }`}
          disabled={loading}
        />
        {validationErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
        )}
      </div>

      {formData.newPassword && formData.newPassword === formData.confirmPassword && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>Importante:</strong> Asegúrate de comunicar la nueva contraseña al usuario de forma segura.
            El usuario deberá cambiarla en su próximo inicio de sesión.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Reseteando...' : 'Resetear Contraseña'}
        </button>
      </div>
    </form>
  );
}