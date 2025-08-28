'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileDashboard } from '../../components/mobile/MobileDashboard';
import { useMobileOptimizations } from '../../hooks/useMobileOptimizations';
import { JWTManager } from '../../lib/jwt';
import { User } from '../../lib/types';

export default function MobilePage() {
  const router = useRouter();
  const { isMobile, isTablet, updateOptimizations } = useMobileOptimizations();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Force mobile optimizations update
    updateOptimizations();

    // Check authentication
    const checkAuth = () => {
      try {
        const storedUser = JWTManager.getUser();
        const token = JWTManager.getToken();

        if (!storedUser || !token) {
          router.push('/login');
          return;
        }

        setUser(storedUser);
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, updateOptimizations]);

  // Redirect non-mobile users to desktop dashboard
  useEffect(() => {
    if (!isLoading && !isMobile && !isTablet) {
      router.push('/dashboard');
    }
  }, [isMobile, isTablet, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Show desktop redirect message for non-mobile devices
  if (!isMobile && !isTablet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Versión Móvil
          </h1>
          <p className="text-gray-600 mb-4">
            Esta página está optimizada para dispositivos móviles. 
            Serás redirigido al dashboard principal.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-page">
      {/* Mobile-specific meta tags and PWA setup would go in layout */}
      <MobileDashboard user={user} />
    </div>
  );
}