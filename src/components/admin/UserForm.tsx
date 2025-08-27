'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { User } from '@/lib/types';
import { auditLogger, AuditAction, ResourceType } from '@/lib/auditLog';

interface UserFormProps {
  user?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  email: string;
  nombre: string;
  rol: 'admin_lider' | 'admin' | 'editor' | 'tecnico';
  password?: string;
  confirmPassword?: string;
  activo: boolean;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    nombre: '',
    rol: 'tecnico',
    password: '',
    confirmPassword: '',
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        activo: user.activo,
        password: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El email no es válido';
    }

    // Name validation
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    // Password validation (only for new users or when changing password)
    if (!user && !formData.password) {
      errors.password = 'La contraseña es requerida para nuevos usuarios';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Confirm password validation
    if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Role validation based on current user permissions
    if (currentUser?.rol === 'admin' && (formData.rol === 'admin_lider' || formData.rol === 'admin')) {
      errors.rol = 'No tienes permisos para asignar este rol';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userData: Partial<User> = {
        email: formData.email.trim(),
        nombre: formData.nombre.trim(),
        rol: formData.rol,
        activo: formData.activo,
      };

      // Add password only if provided
      if (formData.password) {
        (userData as any).password = formData.password;
      }

      let response;
      if (user) {
        const beforeData = { ...user };
        response = await apiClient.updateUser(user.id, userData);
        
        if (response.ok) {
          // Log audit event for user update
          await auditLogger.log(
            AuditAction.USER_UPDATED,
            ResourceType.USER,
            user.id,
            user.nombre,
            {
              before: beforeData,
              after: { ...beforeData, ...userData }
            }
          );
        }
      } else {
        response = await apiClient.createUser(userData);
        
        if (response.ok && response.data) {
          // Log audit event for user creation
          await auditLogger.log(
            AuditAction.USER_CREATED,
            ResourceType.USER,
            response.data.id,
            userData.nombre,
            {
              after: userData
            }
          );
        }
      }

      if (response.ok) {
        onSuccess();
      } else {
        setError(response.message || 'Error al guardar usuario');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getAvailableRoles = () => {
    const roles = [
      { value: 'tecnico', label: 'Técnico' },
      { value: 'editor', label: 'Editor' },
    ];

    // Only admin_lider can assign admin roles
    if (currentUser?.rol === 'admin_lider') {
      roles.push(
        { value: 'admin', label: 'Administrador' },
        { value: 'admin_lider', label: 'Admin Líder' }
      );
    }

    return roles;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.email ? 'border-red-300' : ''
          }`}
          disabled={loading}
        />
        {validationErrors.email && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
          Nombre Completo *
        </label>
        <input
          type="text"
          id="nombre"
          value={formData.nombre}
          onChange={(e) => handleInputChange('nombre', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.nombre ? 'border-red-300' : ''
          }`}
          disabled={loading}
        />
        {validationErrors.nombre && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.nombre}</p>
        )}
      </div>

      <div>
        <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
          Rol *
        </label>
        <select
          id="rol"
          value={formData.rol}
          onChange={(e) => handleInputChange('rol', e.target.value as FormData['rol'])}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.rol ? 'border-red-300' : ''
          }`}
          disabled={loading}
        >
          {getAvailableRoles().map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        {validationErrors.rol && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.rol}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          {user ? 'Nueva Contraseña (dejar vacío para mantener actual)' : 'Contraseña *'}
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            validationErrors.password ? 'border-red-300' : ''
          }`}
          disabled={loading}
          placeholder={user ? 'Dejar vacío para no cambiar' : ''}
        />
        {validationErrors.password && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
        )}
      </div>

      {formData.password && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirmar Contraseña *
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
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="activo"
          checked={formData.activo}
          onChange={(e) => handleInputChange('activo', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={loading}
        />
        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
          Usuario activo
        </label>
      </div>

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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}