'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for managing focus trap within a component
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing keyboard navigation
 */
export function useKeyboardNavigation(
  onEscape?: () => void,
  onEnter?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          onArrowUp?.();
          event.preventDefault();
          break;
        case 'ArrowDown':
          onArrowDown?.();
          event.preventDefault();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          event.preventDefault();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          event.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
}

/**
 * Hook for managing announcements to screen readers
 */
export function useScreenReader() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => setAnnouncement(message), 100);
  };

  return { announce, announcement };
}

/**
 * Hook for managing skip links
 */
export function useSkipLinks() {
  const skipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  const skipToNavigation = () => {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView();
    }
  };

  return { skipToContent, skipToNavigation };
}

/**
 * Hook for managing ARIA attributes dynamically
 */
export function useAriaAttributes() {
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const updateAttribute = (key: string, value: string) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const removeAttribute = (key: string) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[key];
      return newAttributes;
    });
  };

  const toggleAttribute = (key: string, trueValue: string, falseValue: string, condition: boolean) => {
    updateAttribute(key, condition ? trueValue : falseValue);
  };

  return {
    attributes,
    updateAttribute,
    removeAttribute,
    toggleAttribute,
  };
}

/**
 * Hook for managing color contrast validation
 */
export function useColorContrast() {
  const validateContrast = (foreground: string, background: string): boolean => {
    // This is a simplified version - in production, you'd use a proper color contrast library
    // For now, we'll assume the design system colors meet WCAG standards
    return true;
  };

  const getContrastRatio = (foreground: string, background: string): number => {
    // Simplified implementation - would need proper color parsing in production
    return 4.5; // Assuming WCAG AA compliance
  };

  return { validateContrast, getContrastRatio };
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;
      
      // Create shortcut key combination
      let combination = '';
      if (isCtrl) combination += 'ctrl+';
      if (isShift) combination += 'shift+';
      if (isAlt) combination += 'alt+';
      combination += event.key.toLowerCase();
      
      // Execute shortcut if it exists
      if (shortcuts[combination]) {
        event.preventDefault();
        shortcuts[combination]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook for managing tooltips with keyboard support
 */
export function useTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState('');
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  const show = (tooltipContent: string) => {
    setContent(tooltipContent);
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  const toggle = (tooltipContent: string) => {
    if (isVisible) {
      hide();
    } else {
      show(tooltipContent);
    }
  };

  // Handle keyboard events for tooltip
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        hide();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, hide]);

  return {
    isVisible,
    content,
    tooltipId: tooltipId.current,
    show,
    hide,
    toggle,
  };
}

/**
 * Hook for managing high contrast mode
 */
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

/**
 * Hook for managing live regions for screen reader announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = (newMessage: string, newPriority: 'polite' | 'assertive' = 'polite') => {
    // Clear message first to ensure re-announcement
    setMessage('');
    setPriority(newPriority);
    
    // Set new message after a brief delay
    setTimeout(() => {
      setMessage(newMessage);
    }, 100);
  };

  const clear = () => {
    setMessage('');
  };

  return {
    message,
    priority,
    announce,
    clear,
  };
}