'use client';

import { useEffect, useState, useCallback } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  viewportHeight: number;
  viewportWidth: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export function useMobileOptimizations() {
  const [optimizations, setOptimizations] = useState<MobileOptimizations>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    orientation: 'portrait',
    viewportHeight: 0,
    viewportWidth: 0,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const [touchGesture, setTouchGesture] = useState<TouchGesture | null>(null);

  // Detect device capabilities and screen size
  const updateOptimizations = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation = width > height ? 'landscape' : 'portrait';

    // Get safe area insets (for devices with notches, etc.)
    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
    };

    setOptimizations({
      isMobile,
      isTablet,
      isTouch,
      orientation,
      viewportHeight: height,
      viewportWidth: width,
      safeAreaInsets,
    });
  }, []);

  // Handle touch gestures
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchGesture({
        startX: touch.clientX,
        startY: touch.clientY,
        endX: touch.clientX,
        endY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        direction: null,
        distance: 0,
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1 && touchGesture) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchGesture.startX;
      const deltaY = touch.clientY - touchGesture.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let direction: TouchGesture['direction'] = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      setTouchGesture({
        ...touchGesture,
        endX: touch.clientX,
        endY: touch.clientY,
        deltaX,
        deltaY,
        direction,
        distance,
      });
    }
  }, [touchGesture]);

  const handleTouchEnd = useCallback(() => {
    setTouchGesture(null);
  }, []);

  // Apply mobile-specific optimizations to the DOM
  const applyMobileOptimizations = useCallback(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (optimizations.isMobile) {
      // Add mobile-specific classes
      body.classList.add('mobile-optimized', 'mobile-text-optimize');
      html.classList.add('mobile-device');

      // Prevent zoom on input focus (iOS)
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }

      // Add touch-action optimization
      body.style.touchAction = 'manipulation';

      // Optimize scrolling
      body.classList.add('mobile-scroll-optimize');

    } else {
      // Remove mobile-specific classes for desktop
      body.classList.remove('mobile-optimized', 'mobile-text-optimize', 'mobile-scroll-optimize');
      html.classList.remove('mobile-device');
      body.style.touchAction = '';
    }

    // Apply tablet-specific optimizations
    if (optimizations.isTablet) {
      body.classList.add('tablet-optimized');
    } else {
      body.classList.remove('tablet-optimized');
    }

    // Apply touch-specific optimizations
    if (optimizations.isTouch) {
      body.classList.add('touch-device');
    } else {
      body.classList.remove('touch-device');
    }
  }, [optimizations]);

  // Initialize and set up event listeners
  useEffect(() => {
    updateOptimizations();
    
    const handleResize = () => updateOptimizations();
    const handleOrientationChange = () => {
      // Delay to allow for orientation change to complete
      setTimeout(updateOptimizations, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    if (optimizations.isTouch) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [updateOptimizations, handleTouchStart, handleTouchMove, handleTouchEnd, optimizations.isTouch]);

  // Apply optimizations when they change
  useEffect(() => {
    applyMobileOptimizations();
  }, [applyMobileOptimizations]);

  // Utility functions for mobile interactions
  const addTouchFeedback = useCallback((element: HTMLElement) => {
    if (!optimizations.isTouch) return;

    element.classList.add('mobile-touch-feedback');
    
    const handleTouchStart = () => {
      element.classList.add('mobile-tap-animation');
    };
    
    const handleTouchEnd = () => {
      setTimeout(() => {
        element.classList.remove('mobile-tap-animation');
      }, 150);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [optimizations.isTouch]);

  const optimizeForMobile = useCallback((element: HTMLElement) => {
    if (!optimizations.isMobile) return;

    // Add mobile-specific classes
    element.classList.add('mobile-card', 'mobile-shadow');
    
    // Optimize touch targets
    const interactiveElements = element.querySelectorAll('button, [role="button"], a, input');
    interactiveElements.forEach((el) => {
      (el as HTMLElement).classList.add('mobile-button');
    });

    // Add swipe indicators for scrollable content
    const scrollableElements = element.querySelectorAll('.overflow-x-auto, .overflow-x-scroll');
    scrollableElements.forEach((el) => {
      (el as HTMLElement).classList.add('swipe-indicator', 'mobile-scroll-snap');
    });
  }, [optimizations.isMobile]);

  return {
    ...optimizations,
    touchGesture,
    addTouchFeedback,
    optimizeForMobile,
    updateOptimizations,
  };
}

// Hook for handling pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { isMobile, isTouch } = useMobileOptimizations();

  useEffect(() => {
    if (!isMobile || !isTouch) return;

    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        currentY = e.touches[0].clientY;
        const pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 10) {
          setIsPulling(true);
          setPullDistance(pullDistance);
          
          // Prevent default scrolling when pulling
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance > 80 && !isRefreshing) {
        isRefreshing = true;
        try {
          await onRefresh();
        } finally {
          isRefreshing = false;
          setIsPulling(false);
          setPullDistance(0);
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isTouch, isPulling, pullDistance, onRefresh]);

  return {
    isPulling,
    pullDistance,
  };
}

// Hook for handling swipe gestures
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const { touchGesture } = useMobileOptimizations();

  useEffect(() => {
    if (!touchGesture || touchGesture.distance < threshold) return;

    switch (touchGesture.direction) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
      case 'down':
        onSwipeDown?.();
        break;
    }
  }, [touchGesture, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return touchGesture;
}