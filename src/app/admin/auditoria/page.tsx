'use client';

import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function AuditLogPage() {
  return (
    <div className="p-6">
      <AuditLogViewer />
    </div>
  );
}