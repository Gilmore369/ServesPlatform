import React from 'react';

export interface CardKpiProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    trend: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    trend: 'text-green-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    trend: 'text-yellow-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    trend: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    trend: 'text-purple-600',
  },
  gray: {
    bg: 'bg-gray-50',
    icon: 'text-gray-600',
    trend: 'text-gray-600',
  },
};

export function CardKpi({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  isLoading = false,
  onClick,
  className = '',
}: CardKpiProps) {
  const colors = colorClasses[color];
  const isClickable = !!onClick;

  const content = (
    <div className="p-4 sm:p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {Icon && (
            <div className={`w-7 h-7 sm:w-8 sm:h-8 ${colors.bg} rounded-md flex items-center justify-center`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
            </div>
          )}
        </div>
        <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline flex-wrap">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-6 sm:h-8 bg-gray-200 rounded w-16 sm:w-20"></div>
                </div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  {trend && (
                    <div className={`ml-2 flex items-baseline text-xs sm:text-sm font-semibold ${
                      trend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span className="sr-only">
                        {trend.isPositive ? 'Increased' : 'Decreased'} by
                      </span>
                      {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                      {trend.label && (
                        <span className="ml-1 text-gray-500 font-normal">
                          {trend.label}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </dd>
            {subtitle && !isLoading && (
              <dd className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                {subtitle}
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full text-left ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      {content}
    </div>
  );
}