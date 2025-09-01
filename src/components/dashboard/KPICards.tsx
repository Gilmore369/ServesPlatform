"use client";

import React from "react";
import { KPICardsProps } from "@/lib/dashboard-types";

// Icon components for each KPI metric
const ProjectsIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const PersonnelIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const TasksIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const BudgetIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Trend indicator icons
const TrendUpIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 11l5-5m0 0l5 5m-5-5v12"
    />
  </svg>
);

const TrendDownIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 13l-5 5m0 0l-5-5m5 5V6"
    />
  </svg>
);

const TrendStableIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 12H4"
    />
  </svg>
);

// Loading skeleton component
const KPICardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-4 sm:p-6 animate-pulse loading-shimmer">
    <div className="flex items-center">
      <div className="p-2 sm:p-3 rounded-lg bg-gray-200 w-10 h-10 sm:w-12 sm:h-12"></div>
      <div className="ml-3 sm:ml-4 flex-1">
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

// Individual KPI Card component
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconTextColor: string;
  trend?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    description: string;
  };
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  iconTextColor,
  trend,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case "up":
        return <TrendUpIcon />;
      case "down":
        return <TrendDownIcon />;
      case "stable":
        return <TrendStableIcon />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "";

    switch (trend.direction) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "stable":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      // Format large numbers with K suffix
      if (val >= 1000) {
        return `${(val / 1000).toFixed(0)}K`;
      }
      return val.toString();
    }
    return val;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 ease-in-out transform hover:-translate-y-1 p-4 sm:p-6 card-hover card-polish">
      <div className="flex items-center">
        <div
          className={`p-2 sm:p-3 rounded-lg ${iconBgColor} transition-all duration-200 ease-in-out`}
        >
          <div className={`${iconTextColor} transition-colors duration-200`}>
            {icon}
          </div>
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 transition-colors duration-200 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 transition-all duration-300 ease-in-out">
            {formatValue(value)}
          </p>
          {trend && (
            <div className="flex items-center text-xs sm:text-sm">
              <div
                className={`flex items-center ${getTrendColor()} transition-colors duration-200`}
              >
                <div className="transition-transform duration-200 ease-in-out hover:scale-110">
                  {getTrendIcon()}
                </div>
                <span className="ml-1 font-medium">{trend.percentage}%</span>
              </div>
              <span className="ml-2 text-gray-500 transition-colors duration-200 truncate">
                {trend.description}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main KPI Cards component
const KPICards: React.FC<KPICardsProps> = ({ metrics, isLoading = false }) => {
  // Mock trend data - in a real app, this would come from the API
  const getTrendData = (metricType: string) => {
    const trends = {
      activeProjects: {
        direction: "up" as const,
        percentage: 12,
        description: "vs mes anterior",
      },
      activePersonnel: {
        direction: "stable" as const,
        percentage: 0,
        description: "sin cambios",
      },
      pendingTasks: {
        direction: "down" as const,
        percentage: 8,
        description: "vs semana anterior",
      },
      remainingBudget: {
        direction: "up" as const,
        percentage: 5,
        description: "vs proyectado",
      },
    };
    return trends[metricType as keyof typeof trends];
  };

  const formatBudgetValue = (budget: number): string => {
    if (budget >= 1000000) {
      return `S/ ${(budget / 1000000).toFixed(1)}M`;
    } else if (budget >= 1000) {
      return `S/ ${(budget / 1000).toFixed(0)}K`;
    }
    return `S/ ${budget}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 grid-animate">
        {[...Array(4)].map((_, index) => (
          <KPICardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 grid-animate">
      <KPICard
        title="Proyectos Activos"
        value={metrics.activeProjects}
        icon={<ProjectsIcon />}
        iconBgColor="bg-blue-100"
        iconTextColor="text-blue-600"
        trend={getTrendData("activeProjects")}
      />

      <KPICard
        title="Personal Activo"
        value={metrics.activePersonnel}
        icon={<PersonnelIcon />}
        iconBgColor="bg-green-100"
        iconTextColor="text-green-600"
        trend={getTrendData("activePersonnel")}
      />

      <KPICard
        title="Tareas Pendientes"
        value={metrics.pendingTasks}
        icon={<TasksIcon />}
        iconBgColor="bg-yellow-100"
        iconTextColor="text-yellow-600"
        trend={getTrendData("pendingTasks")}
      />

      <KPICard
        title="Presupuesto Restante"
        value={formatBudgetValue(metrics.remainingBudget)}
        icon={<BudgetIcon />}
        iconBgColor="bg-purple-100"
        iconTextColor="text-purple-600"
        trend={getTrendData("remainingBudget")}
      />
    </div>
  );
};

export default KPICards;
