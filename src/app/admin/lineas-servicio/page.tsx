'use client';

import { ServiceLinesConfig } from '@/components/admin/ServiceLinesConfig';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ServiceLinesPage() {
  return (
    <div className="p-6">
      <ServiceLinesConfig />
    </div>
  );
}