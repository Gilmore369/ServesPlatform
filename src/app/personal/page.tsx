'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { Personnel } from '@/lib/types';
import { PersonnelList } from '@/components/personnel/PersonnelList';
import { PersonnelForm } from '@/components/personnel/PersonnelForm';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function PersonnelPage() {
  const { user } = useAuth();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  // Load personnel data
  const loadPersonnel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getPersonnel({ 
        limit: 100,
        q: searchQuery 
      });
      
      if (response.ok && response.data) {
        setPersonnel(response.data);
      } else {
        setError(response.message || 'Error al cargar personal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar personal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
  }, [searchQuery]);

  // Handle create/edit personnel
  const handleSavePersonnel = async (personnelData: Partial<Personnel>) => {
    try {
      if (editingPersonnel) {
        await apiClient.updatePersonnelMember(editingPersonnel.id, personnelData);
      } else {
        await apiClient.createPersonnelMember(personnelData);
      }
      
      setShowForm(false);
      setEditingPersonnel(null);
      loadPersonnel();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle edit personnel
  const handleEditPersonnel = (personnel: Personnel) => {
    setEditingPersonnel(personnel);
    setShowForm(true);
  };

  // Filter personnel based on search and filters
  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = !searchQuery || 
      person.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.dni_ruc.includes(searchQuery) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !specialtyFilter || person.especialidad === specialtyFilter;
    const matchesZone = !zoneFilter || person.zona === zoneFilter;
    
    return matchesSearch && matchesSpecialty && matchesZone;
  });

  // Get unique specialties and zones for filters
  const specialties = [...new Set(personnel.map(p => p.especialidad))].filter(Boolean);
  const zones = [...new Set(personnel.map(p => p.zona))].filter(Boolean);

  // Check permissions
  const canManagePersonnel = user && ['admin_lider', 'admin', 'editor'].includes(user.rol);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
          <p className="text-gray-600">
            Administra colaboradores, especialidades y certificaciones
          </p>
        </div>
        
        {canManagePersonnel && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Colaborador
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              id="search"
              placeholder="Nombre, DNI/RUC o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
              Especialidad
            </label>
            <select
              id="specialty"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las especialidades</option>
              {specialties.map(specialty => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="zone" className="block text-sm font-medium text-gray-700 mb-1">
              Zona
            </label>
            <select
              id="zone"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las zonas</option>
              {zones.map(zone => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Personnel List */}
      <PersonnelList
        personnel={filteredPersonnel}
        onEdit={canManagePersonnel ? handleEditPersonnel : undefined}
        canManage={canManagePersonnel}
      />

      {/* Personnel Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingPersonnel(null);
          }}
          title={editingPersonnel ? 'Editar Colaborador' : 'Nuevo Colaborador'}
        >
          <PersonnelForm
            personnel={editingPersonnel}
            onSave={handleSavePersonnel}
            onCancel={() => {
              setShowForm(false);
              setEditingPersonnel(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}