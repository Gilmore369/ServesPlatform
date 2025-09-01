'use client';

import { ChecklistManager } from '@/components/projects/ChecklistManager';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ChecklistsPage() {
  return (
    <div className="p-6">
      <ChecklistManager />
    </div>
  );
}