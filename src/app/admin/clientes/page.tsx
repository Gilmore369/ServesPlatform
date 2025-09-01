'use client';

import { ClientCatalog } from '@/components/admin/ClientCatalog';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ClientsPage() {
  return (
    <div className="p-6">
      <ClientCatalog />
    </div>
  );
}