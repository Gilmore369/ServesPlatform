'use client';

import { MaterialsCatalog } from '@/components/admin/MaterialsCatalog';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function MaterialsCatalogPage() {
  return (
    <div className="p-6">
      <MaterialsCatalog />
    </div>
  );
}