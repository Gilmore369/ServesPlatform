'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { Personnel } from '@/lib/types';
import { PersonnelDetail } from '@/components/personnel/PersonnelDetail';
import { PersonnelForm } from '@/components/personnel/PersonnelForm';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function PersonnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const personnelId = params.id as string;

  // Load personnel data
  const loadPersonnel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getPersonnelMember(personnelId);
      
      if (response.ok && response.data) {
        setPersonnel(response.data);
      } else {
        setError(response.message || 'Error al cargar datos del colaborador');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos del colaborador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personnelId) {
      loadPersonnel();
    }
  }, [personnelId]);

  // Handle update personnel
  const handleUpdatePersonnel = async (personnelData: Partial<Personnel>) => {
    try {
      await apiClient.updatePersonnelMember(personnelId, personnelData);
      setShowEditForm(false);
      loadPersonnel();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Check permissions
  const canEditPersonnel = user && ['admin_lider', 'admin', 'editor'].includes(user.rol);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
        
        <div className="text-center py-12">
          <p className="text-gray-500">Colaborador no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{personnel.nombres}</h1>
            <p className="text-gray-600">{personnel.especialidad} - {personnel.zona}</p>
          </div>
        </div>
        
        {canEditPersonnel && (
          <button
            onClick={() => setShowEditForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Editar
          </button>
        )}
      </div>

      {/* Personnel Detail */}
      <PersonnelDetail personnel={personnel} />

      {/* Edit Form Modal */}
      {showEditForm && (
        <Modal
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          title="Editar Colaborador"
        >
          <PersonnelForm
            personnel={personnel}
            onSave={handleUpdatePersonnel}
            onCancel={() => setShowEditForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}