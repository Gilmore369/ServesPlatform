'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Client } from '@/lib/types';

interface ClientFormProps {
  client?: Client;
  onSuccess: (client: Client) => void;
  onCancel: () => void;
}

interface ClientFormData {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto_principal: string;
}

const initialFormData: ClientFormData = {
  ruc: '',
  razon_social: '',
  nombre_comercial: '',
  direccion: '',
  telefono: '',
  email: '',
  contacto_principal: '',
};

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>(
    client ? {
      ruc: client.ruc,
      razon_social: client.razon_social,
      nombre_comercial: client.nombre_comercial || '',
      direccion: client.direccion,
      telefono: client.telefono,
      email: client.email,
      contacto_principal: client.contacto_principal,
    } : initialFormData
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle form field changes
  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ruc.trim()) {
      newErrors.ruc = 'El RUC es requerido';
    } else if (!/^\d{11}$/.test(formData.ruc)) {
      newErrors.ruc = 'El RUC debe tener 11 dígitos';
    }

    if (!formData.razon_social.trim()) {
      newErrors.razon_social = 'La razón social es requerida';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.contacto_principal.trim()) {
      newErrors.contacto_principal = 'El contacto principal es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const clientData = {
        ...formData,
        activo: client?.activo ?? true,
      };

      let response;
      if (client) {
        // Update existing client
        response = await apiClient.updateClient(client.id, clientData);
      } else {
        // Create new client
        response = await apiClient.createClient(clientData);
      }

      if (response.ok && response.data) {
        onSuccess(response.data);
      } else {
        throw new Error(response.message || 'Error saving client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Error saving client' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RUC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RUC *
          </label>
          <input
            type="text"
            value={formData.ruc}
            onChange={(e) => handleChange('ruc', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.ruc ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="20123456789"
            maxLength={11}
          />
          {errors.ruc && (
            <p className="mt-1 text-sm text-red-600">{errors.ruc}</p>
          )}
        </div>

        {/* Razón Social */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Razón Social *
          </label>
          <input
            type="text"
            value={formData.razon_social}
            onChange={(e) => handleChange('razon_social', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.razon_social ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Empresa SAC"
          />
          {errors.razon_social && (
            <p className="mt-1 text-sm text-red-600">{errors.razon_social}</p>
          )}
        </div>

        {/* Nombre Comercial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Comercial
          </label>
          <input
            type="text"
            value={formData.nombre_comercial}
            onChange={(e) => handleChange('nombre_comercial', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nombre comercial (opcional)"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono *
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.telefono ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="+51 999 999 999"
          />
          {errors.telefono && (
            <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="contacto@empresa.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Contacto Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contacto Principal *
          </label>
          <input
            type="text"
            value={formData.contacto_principal}
            onChange={(e) => handleChange('contacto_principal', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.contacto_principal ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nombre del contacto principal"
          />
          {errors.contacto_principal && (
            <p className="mt-1 text-sm text-red-600">{errors.contacto_principal}</p>
          )}
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección *
        </label>
        <textarea
          value={formData.direccion}
          onChange={(e) => handleChange('direccion', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.direccion ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Dirección completa del cliente"
        />
        {errors.direccion && (
          <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (client ? 'Actualizar' : 'Crear Cliente')}
        </button>
      </div>
    </form>
  );
}