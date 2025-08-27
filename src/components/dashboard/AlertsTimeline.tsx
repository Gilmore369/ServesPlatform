'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useActivities, usePersonnel, useMaterials } from '@/lib/hooks/useApi';
import { useAuth } from '@/lib/auth';
import { Activity, User, Material, Personnel } from '@/lib/types';

// Icons
const AlertIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CertificateIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

interface Alert {
  id: string;
  type: 'overdue_activity' | 'material_shortage' | 'certification_expiry';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  date: Date;
  entityId?: string;
  entityType?: string;
}



export function AlertsTimeline() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin_lider' || user?.rol === 'admin';

  // Fetch data
  const { data: activities = [], isLoading: activitiesLoading } = useActivities({ limit: 200 });
  const { data: personnel = [], isLoading: personnelLoading } = usePersonnel(
    isAdmin ? { limit: 100 } : undefined
  );
  const { data: materials = [], isLoading: materialsLoading } = useMaterials(
    isAdmin ? { limit: 100 } : undefined
  );

  // Generate alerts
  const alerts = useMemo((): Alert[] => {
    const alertsList: Alert[] = [];
    const today = new Date();

    // 1. Overdue Activities
    activities.forEach((activity: Activity) => {
      const finPlan = new Date(activity.fin_plan);
      const isOverdue = finPlan < today && (activity.estado === 'Pendiente' || activity.estado === 'En progreso');
      
      if (isOverdue) {
        const daysOverdue = Math.ceil((today.getTime() - finPlan.getTime()) / (1000 * 60 * 60 * 24));
        
        alertsList.push({
          id: `overdue_${activity.id}`,
          type: 'overdue_activity',
          title: 'Actividad Vencida',
          description: `${activity.titulo} - ${daysOverdue} día(s) de retraso`,
          severity: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
          date: finPlan,
          entityId: activity.id,
          entityType: 'activity'
        });
      }
    });

    // 2. Material Shortages (only for admins)
    if (isAdmin) {
      materials.forEach((material: Material) => {
        if (material.stock_actual <= material.stock_minimo) {
          const shortage = material.stock_minimo - material.stock_actual;
          
          alertsList.push({
            id: `shortage_${material.id}`,
            type: 'material_shortage',
            title: 'Faltante de Material',
            description: `${material.descripcion} - Stock: ${material.stock_actual} ${material.unidad} (Mín: ${material.stock_minimo})`,
            severity: material.stock_actual === 0 ? 'critical' : shortage > material.stock_minimo * 0.5 ? 'high' : 'medium',
            date: today,
            entityId: material.id,
            entityType: 'material'
          });
        }
      });
    }

    // 3. Certification Expiry Warnings (only for admins)
    if (isAdmin) {
      personnel.forEach((person: Personnel) => {
        try {
          const certifications = person.certificaciones_json ? JSON.parse(person.certificaciones_json as string) : [];
          
          certifications.forEach((cert: { tipo: string; vencimiento: string }) => {
            const expiryDate = new Date(cert.vencimiento);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Alert if expiring within 30 days or already expired
            if (daysUntilExpiry <= 30) {
              alertsList.push({
                id: `cert_${person.id}_${cert.tipo}`,
                type: 'certification_expiry',
                title: daysUntilExpiry < 0 ? 'Certificación Vencida' : 'Certificación por Vencer',
                description: `${person.nombres} - ${cert.tipo} ${daysUntilExpiry < 0 ? `vencida hace ${Math.abs(daysUntilExpiry)} días` : `vence en ${daysUntilExpiry} días`}`,
                severity: daysUntilExpiry < 0 ? 'critical' : daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 15 ? 'medium' : 'low',
                date: expiryDate,
                entityId: person.id,
                entityType: 'personnel'
              });
            }
          });
        } catch (error) {
          // Ignore JSON parsing errors
          console.warn('Error parsing certifications for user:', person.id, error);
        }
      });
    }

    // Sort by severity and date
    return alertsList.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      
      return b.date.getTime() - a.date.getTime();
    });
  }, [activities, materials, personnel, isAdmin]);

  const isLoading = activitiesLoading || (isAdmin && (personnelLoading || materialsLoading));

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'overdue_activity':
        return ClockIcon;
      case 'material_shortage':
        return PackageIcon;
      case 'certification_expiry':
        return CertificateIcon;
      default:
        return AlertIcon;
    }
  };

  const getAlertColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getBadgeVariant = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'danger' as const;
      case 'high':
        return 'warning' as const;
      case 'medium':
        return 'info' as const;
      case 'low':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Alertas del Sistema
        </h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Alertas del Sistema
          </h3>
          {alerts.length > 0 && (
            <Badge variant="danger" size="sm">
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay alertas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Todo está funcionando correctamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {alerts.slice(0, 10).map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const colorClasses = getAlertColor(alert.severity);
              
              return (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.title}
                      </p>
                      <Badge variant={getBadgeVariant(alert.severity)} size="sm">
                        {alert.severity === 'critical' ? 'Crítico' :
                         alert.severity === 'high' ? 'Alto' :
                         alert.severity === 'medium' ? 'Medio' : 'Bajo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {alert.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.date.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {alerts.length > 10 && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">
                  Y {alerts.length - 10} alerta{alerts.length - 10 !== 1 ? 's' : ''} más...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}