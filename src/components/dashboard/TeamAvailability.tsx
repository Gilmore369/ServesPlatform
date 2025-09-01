'use client';

import React from 'react';
import { TeamMember, TeamAvailabilityProps, TEAM_STATUS_COLORS } from '@/lib/dashboard-types';

// Icons
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Loading skeleton component
const TeamMemberSkeleton = () => (
  <div className="flex items-center space-x-3 p-3 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
  </div>
);

// Individual team member component
interface TeamMemberItemProps {
  member: TeamMember;
}

const TeamMemberItem: React.FC<TeamMemberItemProps> = ({ member }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusText = (status: TeamMember['status']) => {
    const statusMap = {
      'Disponible': 'Disponible',
      'En reunión': 'En reunión',
      'En obra': 'En obra',
      'No disponible': 'No disponible'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
          {getInitials(member.name)}
        </div>
        {/* Status indicator */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${TEAM_STATUS_COLORS[member.status]} rounded-full border-2 border-white`}></div>
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {member.role}
        </p>
      </div>

      {/* Status and availability */}
      <div className="text-right">
        <p className="text-xs font-medium text-gray-900">
          {getStatusText(member.status)}
        </p>
        {member.availableFrom && member.status !== 'Disponible' && (
          <p className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="w-3 h-3 mr-1" />
            {member.availableFrom}
          </p>
        )}
      </div>
    </div>
  );
};

// Main TeamAvailability component
export const TeamAvailability: React.FC<TeamAvailabilityProps> = ({
  teamMembers,
  onViewAllPersonnel,
  isLoading = false
}) => {
  // Calculate availability stats
  const availableCount = teamMembers.filter(member => member.status === 'Disponible').length;
  const totalCount = teamMembers.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UsersIcon className="w-5 h-5 mr-2 text-gray-600" />
              Equipo
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {availableCount} de {totalCount} disponible{availableCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onViewAllPersonnel}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Ver todo el personal
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-1">
            {[...Array(5)].map((_, index) => (
              <TeamMemberSkeleton key={index} />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay miembros del equipo</h4>
            <p className="text-gray-600 mb-4">Agrega miembros a tu equipo para comenzar.</p>
            <button
              onClick={onViewAllPersonnel}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Gestionar Personal
            </button>
          </div>
        ) : (
          <>
            {/* Availability summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estado del equipo:</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    <span className="text-gray-900">{availableCount} disponibles</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                    <span className="text-gray-900">{totalCount - availableCount} ocupados</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team members list */}
            <div className="space-y-1">
              {teamMembers.slice(0, 6).map((member) => (
                <TeamMemberItem key={member.id} member={member} />
              ))}
              
              {teamMembers.length > 6 && (
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <button
                    onClick={onViewAllPersonnel}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded transition-colors"
                  >
                    Ver todos los miembros ({teamMembers.length})
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamAvailability;