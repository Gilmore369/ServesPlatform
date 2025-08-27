'use client';

import { useState, useEffect } from 'react';
import { Personnel } from '@/lib/types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PersonnelFormProps {
  personnel?: Personnel | null;
  onSave: (data: Partial<Personnel>) => Promise<void>;
  onCancel: () => void;
}

interface Certification {
  tipo: string;
  vencimiento: string;
}

const SPECIALTIES = [
  'Electricista',
  'Técnico Civil',
  'Técnico CCTV',
  'Técnico Mantenimiento',
  'Supervisor',
  'Ingeniero',
  'Operario',
  'Ayudante',
];

const ZONES = [
  'Lima Norte',
  'Lima Sur',
  'Lima Este',
  'Lima Centro',
  'Callao',
  'Provincias',
];

export function PersonnelForm({ personnel, onSave, onCancel }: PersonnelFormProps) {
  const [formData, setFormData] = useState({
    dni_ruc: '',
    nombres: '',
    telefono: '',
    email: '',
    especialidad: '',
    tarifa_hora: 0,
    zona: '',
    activo: true,
  });

  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (personnel) {
      setFormData({
        dni_ruc: personnel.dni_ruc,
        nombres: personnel.nombres,
        telefono: personnel.telefono,
        email: personnel.email,
        especialidad: personnel.especialidad,
        tarifa_hora: personnel.tarifa_hora,
        zona: personnel.zona,
        activo: personnel.activo,
      });

      // Parse certifications
      if (personnel.certificaciones_json) {
        try {
          const parsedCerts = JSON.parse(personnel.certificaciones_json);
          setCertifications(parsedCerts);
        } catch {
          setCertifications([]);
        }
      }
    }
  }, [personnel]);

  // Handle form field changes
  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle certification changes
  const handleCertificationChange = (index: number, field: keyof Certification, value: string) => {
    setCertifications(prev => prev.map((cert, i) => 
      i === index ? { ...cert, [field]: value } : cert
    ));
  };

  // Add new certification
  const addCertification = () => {
    setCertifications(prev => [...prev, { tipo: '', vencimiento: '' }]);
  };

  // Remove certification
  const removeCertification = (index: number) => {
    setCertifications(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.dni_ruc.trim()) return 'DNI/RUC es requerido';
    if (!formData.nombres.trim()) return 'Nombre es requerido';
    if (!formData.email.trim()) return 'Email es requerido';
    if (!formData.especialidad) return 'Especialidad es requerida';
    if (!formData.zona) return 'Zona es requerida';
    if (formData.tarifa_hora <= 0) return 'Tarifa por hora debe ser mayor a 0';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Email no válido';

    // Validate certifications
    for (const cert of certifications) {
      if (cert.tipo && !cert.vencimiento) {
        return 'Todas las certificaciones deben tener fecha de vencimiento';
      }
      if (!cert.tipo && cert.vencimiento) {
        return 'Todas las certificaciones deben tener tipo';
      }
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter out empty certifications
      const validCertifications = certifications.filter(cert => cert.tipo && cert.vencimiento);
      
      const dataToSave = {
        ...formData,
        certificaciones_json: validCertifications.length > 0 ? JSON.stringify(validCertifications) : undefined,
      };

      await onSave(dataToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar colaborador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dni_ruc" className="block text-sm font-medium text-gray-700 mb-1">
            DNI/RUC *
          </label>
          <input
            type="text"
            id="dni_ruc"
            value={formData.dni_ruc}
            onChange={(e) => handleChange('dni_ruc', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="12345678 o 20123456789"
          />
        </div>

        <div>
          <label htmlFor="nombres" className="block text-sm font-medium text-gray-700 mb-1">
            Nombres Completos *
          </label>
          <input
            type="text"
            id="nombres"
            value={formData.nombres}
            onChange={(e) => handleChange('nombres', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Juan Pérez García"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="juan.perez@email.com"
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="999 888 777"
          />
        </div>

        <div>
          <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 mb-1">
            Especialidad *
          </label>
          <select
            id="especialidad"
            value={formData.especialidad}
            onChange={(e) => handleChange('especialidad', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar especialidad</option>
            {SPECIALTIES.map(specialty => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">
            Zona *
          </label>
          <select
            id="zona"
            value={formData.zona}
            onChange={(e) => handleChange('zona', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar zona</option>
            {ZONES.map(zone => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tarifa_hora" className="block text-sm font-medium text-gray-700 mb-1">
            Tarifa por Hora (S/) *
          </label>
          <input
            type="number"
            id="tarifa_hora"
            step="0.01"
            min="0"
            value={formData.tarifa_hora}
            onChange={(e) => handleChange('tarifa_hora', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="25.00"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="activo"
            checked={formData.activo}
            onChange={(e) => handleChange('activo', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
            Colaborador activo
          </label>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Certificaciones</h3>
          <button
            type="button"
            onClick={addCertification}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Certificación
          </button>
        </div>

        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tipo de certificación"
                  value={cert.tipo}
                  onChange={(e) => handleCertificationChange(index, 'tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  placeholder="Fecha de vencimiento"
                  value={cert.vencimiento}
                  onChange={(e) => handleCertificationChange(index, 'vencimiento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCertification(index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          {certifications.length === 0 && (
            <p className="text-gray-500 text-sm italic">
              No hay certificaciones agregadas. Haz clic en "Agregar Certificación" para añadir una.
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : (personnel ? 'Actualizar' : 'Crear')} Colaborador
        </button>
      </div>
    </form>
  );
}