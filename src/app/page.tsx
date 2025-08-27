'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JWTManager } from '@/lib/jwt';
import { Loading } from '@/components/ui/Loading';

export default function Home() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simple authentication check without complex hooks
    const checkAuth = () => {
      try {
        const isAuthenticated = JWTManager.isAuthenticated();
        
        if (isAuthenticated) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      } finally {
        setIsChecking(false);
      }
    };

    // Small delay to prevent immediate redirect
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" text="Cargando..." />
      </div>
    );
  }

  return null;
}
