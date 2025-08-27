'use client';

import { useState } from 'react';
import { Project, Activity, User } from '@/lib/types';
import { KanbanBoard } from './KanbanBoard';
import { MiniGantt } from './MiniGantt';
import { MaterialsTab } from '../materials/MaterialsTab';
import { ProjectDocuments } from '../docs/ProjectDocuments';
import {
  ListBulletIcon,
  CalendarDaysIcon,
  CubeIcon,
  UsersIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ProjectTabsProps {
  project: Project;
  activities: Activity[];
  users: User[];
  onProjectUpdate: (project: Project) => void;
  onActivitiesUpdate: () => void;
}

type TabKey = 'activities' | 'materials' | 'personnel' | 'documents' | 'costs' | 'quality' | 'history';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  component: React.ComponentType<{ project: Project; activities?: Activity[]; users?: User[]; onProjectUpdate?: (project: Project) => void; onActivitiesUpdate?: () => void; }>;
}

// Placeholder components for tabs not yet implemented

const PersonnelTab = ({ project }: { project: Project }) => (
  <div className="p-6 text-center text-gray-500">
    <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
    <h3 className="text-lg font-medium mb-2">Personal & Horas</h3>
    <p>Esta funcionalidad será implementada en las siguientes tareas.</p>
  </div>
);

const DocumentsTab = ({ project }: { project: Project }) => (
  <ProjectDocuments projectId={project.id} />
);

const CostsTab = ({ project }: { project: Project }) => (
  <div className="p-6 text-center text-gray-500">
    <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
    <h3 className="text-lg font-medium mb-2">Costos & Presupuesto</h3>
    <p>Esta funcionalidad será implementada en las siguientes tareas.</p>
  </div>
);

const QualityTab = ({ project }: { project: Project }) => (
  <div className="p-6 text-center text-gray-500">
    <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
    <h3 className="text-lg font-medium mb-2">Riesgos/Calidad</h3>
    <p>Esta funcionalidad será implementada en las siguientes tareas.</p>
  </div>
);

const HistoryTab = ({ project }: { project: Project }) => (
  <div className="p-6 text-center text-gray-500">
    <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
    <h3 className="text-lg font-medium mb-2">Historial</h3>
    <p>Esta funcionalidad será implementada en las siguientes tareas.</p>
  </div>
);

// Activities tab component with Kanban and Gantt views
const ActivitiesTab = ({ 
  project, 
  activities = [], 
  users = [], 
  onActivitiesUpdate 
}: { 
  project: Project;
  activities?: Activity[];
  users?: User[];
  onActivitiesUpdate?: () => void;
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Actividades del Proyecto</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListBulletIcon className="h-4 w-4 inline mr-1" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'gantt'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
            Gantt
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          activities={activities}
          users={users}
          projectId={project.id}
          onUpdate={onActivitiesUpdate || (() => {})}
        />
      ) : (
        <MiniGantt
          activities={activities}
          users={users}
          projectId={project.id}
          onUpdate={onActivitiesUpdate || (() => {})}
        />
      )}
    </div>
  );
};

export function ProjectTabs({
  project,
  activities,
  users,
  onProjectUpdate,
  onActivitiesUpdate,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('activities');

  const tabs: Tab[] = [
    {
      key: 'activities',
      label: 'Actividades',
      icon: ListBulletIcon,
      component: ActivitiesTab,
    },
    {
      key: 'materials',
      label: 'Materiales & BOM',
      icon: CubeIcon,
      component: MaterialsTab,
    },
    {
      key: 'personnel',
      label: 'Personal & Horas',
      icon: UsersIcon,
      component: PersonnelTab,
    },
    {
      key: 'documents',
      label: 'Documentos',
      icon: DocumentIcon,
      component: DocumentsTab,
    },
    {
      key: 'costs',
      label: 'Costos & Presupuesto',
      icon: CurrencyDollarIcon,
      component: CostsTab,
    },
    {
      key: 'quality',
      label: 'Riesgos/Calidad',
      icon: ShieldCheckIcon,
      component: QualityTab,
    },
    {
      key: 'history',
      label: 'Historial',
      icon: ClockIcon,
      component: HistoryTab,
    },
  ];

  const activeTabData = tabs.find(tab => tab.key === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {ActiveComponent && (
          <ActiveComponent
            project={project}
            activities={activities}
            users={users}
            onProjectUpdate={onProjectUpdate}
            onActivitiesUpdate={onActivitiesUpdate}
          />
        )}
      </div>
    </div>
  );
}