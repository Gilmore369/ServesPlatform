# KPI Cards Component

## Overview

The KPI Cards component displays key performance indicators in a responsive grid layout with icons, colors, trend indicators, and loading states.

## Features

✅ **4 Metric Cards**: Displays Proyectos Activos, Personal Activo, Tareas Pendientes, and Presupuesto Restante
✅ **Icons and Colors**: Each card has distinctive icons and color schemes
✅ **Trend Indicators**: Shows up/down/stable trends with percentages and descriptions
✅ **Responsive Grid Layout**: Adapts from 1 column (mobile) to 4 columns (desktop)
✅ **Loading States**: Animated skeleton loaders while data is fetching
✅ **Data Formatting**: Proper formatting for numbers and currency values
✅ **Hover Effects**: Smooth shadow transitions on card hover
✅ **TypeScript Support**: Fully typed with proper interfaces

## Usage

```tsx
import { KPICards } from '@/components/dashboard';
import { DashboardMetrics } from '@/lib/dashboard-types';

const metrics: DashboardMetrics = {
  activeProjects: 12,
  activePersonnel: 24,
  pendingTasks: 48,
  remainingBudget: 125000,
};

<KPICards metrics={metrics} isLoading={false} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `metrics` | `DashboardMetrics` | Yes | Object containing the 4 KPI values |
| `isLoading` | `boolean` | No | Shows loading skeletons when true |

## Responsive Behavior

- **Mobile (< 768px)**: Single column layout
- **Tablet (768px - 1023px)**: 2 columns
- **Desktop (1024px+)**: 4 columns

## Data Formatting

- **Numbers**: Large numbers formatted with K suffix (e.g., 1500 → 1K)
- **Budget**: Currency formatted with S/ prefix and K/M suffixes (e.g., 125000 → S/ 125K)
- **Trends**: Percentage with directional arrows and descriptive text

## Color Scheme

- **Projects**: Blue (`bg-blue-100`, `text-blue-600`)
- **Personnel**: Green (`bg-green-100`, `text-green-600`)
- **Tasks**: Yellow (`bg-yellow-100`, `text-yellow-600`)
- **Budget**: Purple (`bg-purple-100`, `text-purple-600`)

## Requirements Fulfilled

This component fulfills the following requirements from the dashboard redesign specification:

- **Requirement 2.1**: Shows 4 metric cards with distinctive icons and colors
- **Requirement 2.2**: Includes trend indicators with descriptive text
- **Requirement 2.3**: Reflects real data from the backend (via props)
- **Requirement 2.4**: Updates metrics dynamically
- **Requirement 8.1**: Fully responsive design
- **Requirement 8.4**: Proper grid reorganization for mobile devices

## Testing

The component includes comprehensive unit tests covering:
- Rendering of all KPI cards
- Correct display of metric values
- Budget value formatting
- Loading state behavior
- Trend indicator display
- Responsive grid layout classes
- Hover effect application

Run tests with:
```bash
npm test KPICards.test.tsx
```