'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { auditLogger, AuditLogEntry, AuditAction, ResourceType } from '@/lib/auditLog';
import { apiClient } from '@/lib/apiClient';
import { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CardKpi } from '@/components/ui/CardKpi';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Permission } from '@/lib/permissions';
import { 
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface UserActivityStats {
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  failedLogins: number;
  recentActivities: AuditLogEntry[];
  securityEvents: AuditLogEntry[];
}

export function UserActivityDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserActivityStats>({
    totalUsers: 0,
    activeUsers: 0,
    recentLogins: 0,
    failedLogins: 0,
    recentActivities: [],
    securityEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserActivityStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user statistics
      const usersResponse = await apiClient.getUsers();
      const users = usersResponse.data || [];
      
      // Get recent audit logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentActivities = await auditLogger.getAuditLog({
        fecha_inicio: sevenDaysAgo,
        limit: 50,
      });

      // Calculate statistics
      const totalUsers = users.length;
      const activeUsers = users.filter((u: User) => u.activo).length;
      
      const recentLogins = recentActivities.filter(
        entry => entry.accion === AuditAction.USER_LOGIN
      ).length;
      
      const failedLogins = recentActivities.filter(
        entry => entry.accion === AuditAction.LOGIN_FAILED
      ).length;

      const securityEvents = recentActivities.filter(
        entry => entry.accion.includes('failed') || 
                entry.accion.includes('denied') || 
                entry.accion.includes('unauthorized')
      );

      setStats({
        totalUsers,
        activeUsers,
        recentLogins,
        failedLogins,
        recentActivities: recentActivities.slice(0, 10), // Show last 10 activities
        securityEvents: securityEvents.slice(0, 5), // Show last 5 security events
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserActivityStats();
  }, []);

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('login') && !action.includes('failed')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('created')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (action.includes('updated')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (action.includes('deleted') || action.includes('deactivated')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('failed') || action.includes('denied') || action.includes('unauthorized')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <PermissionGate permission={Permission.VIEW_ALL_USERS}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Actividad de Usuarios
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Resumen de la actividad y seguridad de usuarios en los últimos 7 días
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardKpi
            title="Total Usuarios"
            value={stats.totalUsers.toString()}
            icon={UserIcon}
            loading={loading}
            className="bg-blue-50 border-blue-200"
          />
          <CardKpi
            title="Usuarios Activos"
            value={stats.activeUsers.toString()}
            icon={ShieldCheckIcon}
            loading={loading}
            className="bg-green-50 border-green-200"
          />
          <CardKpi
            title="Inicios de Sesión"
            value={stats.recentLogins.toString()}
            subtitle="Últimos 7 días"
            icon={ClockIcon}
            loading={loading}
            className="bg-indigo-50 border-indigo-200"
          />
          <CardKpi
            title="Intentos Fallidos"
            value={stats.failedLogins.toString()}
            subtitle="Últimos 7 días"
            icon={ExclamationTriangleIcon}
            loading={loading}
            className={stats.failedLogins > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                Actividad Reciente
              </h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.usuario_nombre}
                          </p>
                          <Badge className={getActionBadgeColor(activity.accion)}>
                            {formatActionName(activity.accion)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {activity.recurso_nombre && (
                            <span>{activity.recurso_nombre} • </span>
                          )}
                          {getTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No hay actividad reciente
                </p>
              )}
            </div>
          </div>

          {/* Security Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
                Eventos de Seguridad
              </h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.securityEvents.length > 0 ? (
                <div className="space-y-4">
                  {stats.securityEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.usuario_nombre}
                          </p>
                          <Badge className="bg-red-100 text-red-800">
                            {formatActionName(event.accion)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {event.recurso_nombre && (
                            <span>{event.recurso_nombre} • </span>
                          )}
                          {getTimeAgo(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <ShieldCheckIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">
                    No hay eventos de seguridad recientes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <PermissionGate permission={Permission.VIEW_AUDIT_LOG}>
              <button
                onClick={() => window.location.href = '/admin/auditoria'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Ver Log Completo
              </button>
            </PermissionGate>
            
            <PermissionGate permission={Permission.CREATE_USER}>
              <button
                onClick={() => window.location.href = '/admin/usuarios'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Gestionar Usuarios
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}