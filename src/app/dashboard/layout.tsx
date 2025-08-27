'use client';

import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Loading } from '@/components/ui/Loading';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" text="Cargando dashboard..." />
      </div>
    );
  }

  if (!user) {
    return null; // Auth provider will handle redirect
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  );
}