'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useReducedMotion, useHighContrast, useLiveRegion } from '@/lib/hooks/useAccessibility';

interface AccessibilityContextType {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  keyboardNavigationMode: boolean;
  setKeyboardNavigationMode: (enabled: boolean) => void;
  fontSize: 'normal' | 'large' | 'larger';
  setFontSize: (size: 'normal' | 'large' | 'larger') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const prefersReducedMotion = useReducedMotion();
  const prefersHighContrast = useHighContrast();
  const { announce } = useLiveRegion();
  const [keyboardNavigationMode, setKeyboardNavigationMode] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setKeyboardNavigationMode(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigationMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Apply keyboard navigation class to body
  useEffect(() => {
    if (keyboardNavigationMode) {
      document.body.classList.add('keyboard-navigation');
    } else {
      document.body.classList.remove('keyboard-navigation');
    }
  }, [keyboardNavigationMode]);

  // Apply font size class to body
  useEffect(() => {
    document.body.classList.remove('font-size-normal', 'font-size-large', 'font-size-larger');
    document.body.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  // Apply high contrast class to body
  useEffect(() => {
    if (prefersHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [prefersHighContrast]);

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  };

  const value: AccessibilityContextType = {
    prefersReducedMotion,
    prefersHighContrast,
    announceMessage,
    keyboardNavigationMode,
    setKeyboardNavigationMode,
    fontSize,
    setFontSize,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Hook for announcing messages globally
export function useAnnounce() {
  const { announceMessage } = useAccessibility();
  return announceMessage;
}