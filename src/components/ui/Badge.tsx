import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  secondary: 'bg-purple-100 text-purple-800',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const clickableClass = onClick ? 'cursor-pointer hover:opacity-80' : '';

  const classes = `${baseClasses} ${variantClass} ${sizeClass} ${clickableClass} ${className}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return (
    <span className={classes}>
      {children}
    </span>
  );
}

// Predefined status badges for common use cases
export function StatusBadge({ status }: { status: string }) {
  const getVariant = (status: string): BadgeProps['variant'] => {
    const normalizedStatus = status.toLowerCase();
    
    if (['completada', 'activo', 'aprobado', 'cerrado'].includes(normalizedStatus)) {
      return 'success';
    }
    if (['en progreso', 'en proceso', 'pendiente'].includes(normalizedStatus)) {
      return 'info';
    }
    if (['pausado', 'en revisión', 'revision'].includes(normalizedStatus)) {
      return 'warning';
    }
    if (['cancelado', 'rechazado', 'vencido', 'inactivo'].includes(normalizedStatus)) {
      return 'danger';
    }
    
    return 'default';
  };

  return (
    <Badge variant={getVariant(status)}>
      {status}
    </Badge>
  );
}

// Priority badge for activities
export function PriorityBadge({ priority }: { priority: string }) {
  const getVariant = (priority: string): BadgeProps['variant'] => {
    const normalizedPriority = priority.toLowerCase();
    
    if (normalizedPriority === 'crítica') return 'danger';
    if (normalizedPriority === 'alta') return 'warning';
    if (normalizedPriority === 'media') return 'info';
    if (normalizedPriority === 'baja') return 'secondary';
    
    return 'default';
  };

  return (
    <Badge variant={getVariant(priority)} size="sm">
      {priority}
    </Badge>
  );
}

// Role badge for users
export function RoleBadge({ role }: { role: string }) {
  const getVariant = (role: string): BadgeProps['variant'] => {
    const normalizedRole = role.toLowerCase().replace('_', ' ');
    
    if (normalizedRole === 'admin lider') return 'danger';
    if (normalizedRole === 'admin') return 'warning';
    if (normalizedRole === 'editor') return 'info';
    if (normalizedRole === 'tecnico') return 'secondary';
    
    return 'default';
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Badge variant={getVariant(role)} size="sm">
      {formatRole(role)}
    </Badge>
  );
}