# RecentProjects Component

## Overview
The RecentProjects component displays a grid of project cards showing recent projects with their status, progress, team members, and key information. It's part of the dashboard redesign and follows the requirements specified in the dashboard specification.

## Features
- **Project Cards**: Display project name, description, status badge, and progress bar
- **Team Avatars**: Show team member initials in circular avatars
- **Progress Visualization**: Color-coded progress bars with percentage display
- **Interactive Elements**: "Ver detalles" buttons and "Nuevo Proyecto" button
- **Responsive Design**: Adapts from 3 columns on desktop to 1 column on mobile
- **Loading States**: Skeleton loading cards while data is being fetched
- **Empty State**: Helpful message and call-to-action when no projects exist

## Props
```typescript
interface RecentProjectsProps {
  projects: DashboardProject[];
  onViewDetails: (projectId: string) => void;
  onNewProject: () => void;
  isLoading?: boolean;
}
```

## Usage
```tsx
import { RecentProjects } from '@/components/dashboard';

function Dashboard() {
  const handleViewDetails = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleNewProject = () => {
    router.push('/projects/new');
  };

  return (
    <RecentProjects
      projects={projects}
      onViewDetails={handleViewDetails}
      onNewProject={handleNewProject}
      isLoading={isLoadingProjects}
    />
  );
}
```

## Requirements Fulfilled
- **3.1**: Shows project cards with name, status, description, and progress
- **3.2**: Includes visual progress bar, dates, and team avatars
- **3.3**: "Ver detalles" button navigates to project page
- **3.4**: "Nuevo Proyecto" button for creating new projects
- **8.4**: Responsive grid layout for mobile devices

## Styling
- Uses Tailwind CSS for consistent styling
- Hover animations with shadow and transform effects
- Color-coded status badges and progress bars
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## Accessibility
- Proper button focus states with ring indicators
- Semantic HTML structure
- Alt text and titles for team member avatars
- Keyboard navigation support