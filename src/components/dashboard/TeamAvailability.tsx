"use client";

import { TeamAvailabilityProps, TeamMember, TEAM_STATUS_COLORS } from '@/lib/dashboard-types';
// Icon components
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function TeamAvailability({ 
  teamMembers, 
  onViewAllPersonnel, 
  isLoading = false 
}: TeamAvailabilityProps) {
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="text-gray-400">
            <UsersIcon />
          </div>
            <h3 className="text-lg font-semibold text-gray-900">Disponibilidad del Equipo</h3>
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Helper function to get status display text
  const getStatusDisplay = (member: TeamMember) => {
    if (member.status === 'Disponible' && member.availableFrom) {
      return `Disponible desde ${member.availableFrom}`;
    }
    return member.status;
  };

  // Helper function to get avatar initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="text-blue-600">
            <UsersIcon />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Disponibilidad del Equipo</h3>
        </div>
        <span className="text-sm text-gray-500">
          {teamMembers.length} miembros
        </span>
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {teamMembers.map((member) => (
          <div 
            key={member.id} 
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            {/* Avatar */}
            <div className="relative">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                  {getInitials(member.name)}
                </div>
              )}
              
              {/* Status Indicator */}
              <div 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${TEAM_STATUS_COLORS[member.status]}`}
                title={member.status}
              ></div>
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.name}
                </p>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-500 truncate">
                  {member.role}
                </p>
                {member.availableFrom && member.status === 'Disponible' && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <div className="flex items-center space-x-1">
                      <div className="text-gray-400">
                        <ClockIcon />
                      </div>
                      <span className="text-xs text-gray-500">
                        desde {member.availableFrom}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                member.status === 'Disponible' 
                  ? 'bg-green-100 text-green-800'
                  : member.status === 'En reunión'
                  ? 'bg-yellow-100 text-yellow-800'
                  : member.status === 'En obra'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {getStatusDisplay(member)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {teamMembers.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-300 mx-auto mb-4">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No hay miembros del equipo disponibles</p>
        </div>
      )}

      {/* View All Personnel Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onViewAllPersonnel}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors duration-200 group"
        >
          <UsersIcon />
          <span className="text-sm font-medium">Ver Todo el Personal</span>
          <div className="group-hover:translate-x-1 transition-transform duration-200">
            <ArrowRightIcon />
          </div>
        </button>
      </div>
    </div>
  );
}