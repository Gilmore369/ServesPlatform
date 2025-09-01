'use client';

import { UserManagement } from '@/components/admin/UserManagement';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <div className="p-6">
      <UserManagement />
    </div>
  );
}