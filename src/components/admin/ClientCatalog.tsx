'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Client } from '@/lib/types';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { ClientForm } from '@/components/clients/ClientForm';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

export function ClientCatalog() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showClientForm, setShowClientForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getClients({ q: searchQuery });
      
      if (response.ok && response.data) {
        setClients(response.data);
      } else {
        setError(response.message || 'Error al cargar clientes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [searchQuery]);

  const handleCreateClient = () => {
    setSelectedClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientForm(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (client: Client) => {
    try {
      const response = await apiClient.updateClient(client.id, {
        activo: !client.activo
      });

      if (response.ok) {
        await loadClients();
      } else {
        setError(response.message || 'Error al actualizar cliente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const confirmDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      const response = await apiClient.delete('Clientes', selectedClient.id);
      
      if (response.ok) {
        await loadClients();
        setShowDeleteConfirm(false);
        setSelectedClient(null);
      } else {
        setError(response.message || 'Error al eliminar cliente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const handleClientFormSuccess = async () => {
    setShowClientForm(false);
    setSelectedClient(null);
    await loadClients();
  };

  const columns = [
    {
      key: 'razon_social',
      label: 'Cliente',
      render: (client: Client) => (
        <div>
          <div className="font-medium text-gray-900">{client.razon_social}</div>
          {client.nombre_comercial && (
            <div className="text-sm text-gray-500">{client.nombre_comercial}</div>
          )}
          <div className="text-xs text-gray-400">RUC: {client.ruc}</div>
        </div>
      ),
    },
    {
      key: 'contacto',
      label: 'Contacto',
      render: (client: Client) => (
        <div>
          <div className="text-sm text-gray-900">{client.contacto_principal}</div>
          <div className="text-xs text-gray-500">{client.email}</div>
          <div className="text-xs text-gray-500">{client.telefono}</div>
        </div>
      ),
    },
    {
      key: 'direccion',
      label: 'Dirección',
      render: (client: Client) => (
        <span className="text-sm text-gray-600">{client.direccion}</span>
      ),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (client: Client) => (
        <Badge className={client.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {client.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (client: Client) => (
        <span className="text-sm text-gray-500">
          {new Date(client.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (client: Client) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditClient(client)}
            className="text-blue-600 hover:text-blue-900"
            title="Editar cliente"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handleToggleActive(client)}
            className={client.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
            title={client.activo ? 'Desactivar cliente' : 'Activar cliente'}
          >
            {client.activo ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => handleDeleteClient(client)}
            className="text-red-600 hover:text-red-900"
            title="Eliminar cliente"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <BuildingOfficeIcon className="h-6 w-6 mr-2" />
              Catálogo de Clientes
            </h1>
            <p className="mt-1 text-gray-600">
              Gestiona la información de los clientes del sistema
            </p>
          </div>
          
          <button
            onClick={handleCreateClient}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <Table
          data={clients}
          columns={columns}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por razón social, RUC o contacto..."
        />
      </div>

      {/* Client Form Modal */}
      <Modal
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        title={selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <ClientForm
          client={selectedClient}
          onSuccess={handleClientFormSuccess}
          onCancel={() => setShowClientForm(false)}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteClient}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar al cliente "${selectedClient?.razon_social}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}