'use client';

import { SystemConfiguration } from '@/components/admin/SystemConfiguration';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ConfigPage() {
  return (
    <div className="p-6">
      <SystemConfiguration />
    </div>
  );
}