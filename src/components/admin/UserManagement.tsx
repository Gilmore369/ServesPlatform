'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { User } from '@/lib/types';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { IfPermission } from '@/components/ui/ConditionalRender';
import { Permission } from '@/lib/permissions';
import { usePermission, useCanPerformAction } from '@/lib/hooks/usePermissions';
import { auditLogger, AuditAction, ResourceType } from '@/lib/auditLog';
import { UserForm } from './UserForm';
import { PasswordResetForm } from './PasswordResetForm';
import { AuditLogViewer } from './AuditLogViewer';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldExclamationIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUsers({ q: searchQuery });
      
      if (response.ok && response.data) {
        setUsers(response.data);
      } else {
        setError(response.message || 'Error al cargar usuarios');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchQuery]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user);
    setShowPasswordReset(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleToggleActive = async (user: User) => {
    try {
      const wasActive = user.activo;
      const response = await apiClient.updateUser(user.id, {
        activo: !user.activo
      });

      if (response.ok) {
        // Log audit event
        await auditLogger.log(
          wasActive ? AuditAction.USER_DEACTIVATED : AuditAction.USER_ACTIVATED,
          ResourceType.USER,
          user.id,
          user.nombre,
          {
            before: { activo: wasActive },
            after: { activo: !wasActive }
          }
        );
        
        await loadUsers();
      } else {
        setError(response.message || 'Error al actualizar usuario');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await apiClient.delete('Usuarios', selectedUser.id);
      
      if (response.ok) {
        // Log audit event
        await auditLogger.log(
          AuditAction.USER_DELETED,
          ResourceType.USER,
          selectedUser.id,
          selectedUser.nombre,
          {
            before: selectedUser
          }
        );
        
        await loadUsers();
        setShowDeleteConfirm(false);
        setSelectedUser(null);
      } else {
        setError(response.message || 'Error al eliminar usuario');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    }
  };

  const handleUserFormSuccess = async () => {
    setShowUserForm(false);
    setSelectedUser(null);
    await loadUsers();
  };

  const handlePasswordResetSuccess = () => {
    setShowPasswordReset(false);
    setSelectedUser(null);
  };

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin_lider':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-orange-100 text-orange-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'tecnico':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRoleName = (rol: string) => {
    switch (rol) {
      case 'admin_lider':
        return 'Admin Líder';
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'tecnico':
        return 'Técnico';
      default:
        return rol;
    }
  };

  // Permission-based access control
  const canCreateUser = usePermission(Permission.CREATE_USER);
  const canEditUsers = usePermission(Permission.EDIT_USER);
  const canDeleteUsers = usePermission(Permission.DELETE_USER);
  const canResetPasswords = usePermission(Permission.RESET_PASSWORD);

  const canEditUser = (user: User) => {
    if (!currentUser || !canEditUsers) return false;
    
    // Admin líder puede editar a todos
    if (currentUser.rol === 'admin_lider') return true;
    
    // Admin puede editar a editores y técnicos, pero no a otros admins o admin líder
    if (currentUser.rol === 'admin') {
      return user.rol === 'editor' || user.rol === 'tecnico';
    }
    
    return false;
  };

  const canDeleteUser = (user: User) => {
    if (!currentUser || !canDeleteUsers) return false;
    
    // No se puede eliminar a sí mismo
    if (user.id === currentUser.id) return false;
    
    return canEditUser(user);
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Nombre',
      render: (user: User) => (
        <div>
          <div className="font-medium text-gray-900">{user.nombre}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (user: User) => (
        <Badge className={getRoleBadgeColor(user.rol)}>
          {formatRoleName(user.rol)}
        </Badge>
      ),
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (user: User) => (
        <Badge className={user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {user.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (user: User) => (
        <span className="text-sm text-gray-500">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (user: User) => (
        <div className="flex space-x-2">
          {canEditUser(user) && (
            <>
              <PermissionGate 
                permission={Permission.EDIT_USER}
                resourceId={user.id}
                resourceType="user"
              >
                <button
                  onClick={() => handleEditUser(user)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Editar usuario"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </PermissionGate>
              
              <PermissionGate permission={Permission.RESET_PASSWORD}>
                <button
                  onClick={() => handlePasswordReset(user)}
                  className="text-yellow-600 hover:text-yellow-900"
                  title="Resetear contraseña"
                >
                  <KeyIcon className="h-4 w-4" />
                </button>
              </PermissionGate>
              
              <PermissionGate permission={Permission.EDIT_USER}>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={user.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                  title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                >
                  {user.activo ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </PermissionGate>
            </>
          )}
          
          {canDeleteUser(user) && (
            <PermissionGate 
              permission={Permission.DELETE_USER}
              resourceId={user.id}
              resourceType="user"
            >
              <button
                onClick={() => handleDeleteUser(user)}
                className="text-red-600 hover:text-red-900"
                title="Eliminar usuario"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </PermissionGate>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="mt-1 text-gray-600">
              Administra los usuarios del sistema y sus permisos
            </p>
          </div>
          
          <div className="flex space-x-3">
            <IfPermission permission={Permission.VIEW_AUDIT_LOG}>
              <button
                onClick={() => setActiveTab(activeTab === 'audit' ? 'users' : 'audit')}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  activeTab === 'audit'
                    ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                {activeTab === 'audit' ? 'Ver Usuarios' : 'Log de Auditoría'}
              </button>
            </IfPermission>
            
            {activeTab === 'users' && (
              <IfPermission permission={Permission.CREATE_USER}>
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </button>
              </IfPermission>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <div className="bg-white shadow rounded-lg">
          <Table
            data={users}
            columns={columns}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nombre o email..."
          />
        </div>
      ) : (
        <AuditLogViewer />
      )}

      {/* User Form Modal */}
      <Modal
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        title={selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <UserForm
          user={selectedUser}
          onSuccess={handleUserFormSuccess}
          onCancel={() => setShowUserForm(false)}
        />
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        title="Resetear Contraseña"
      >
        <PasswordResetForm
          user={selectedUser}
          onSuccess={handlePasswordResetSuccess}
          onCancel={() => setShowPasswordReset(false)}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteUser}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${selectedUser?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}