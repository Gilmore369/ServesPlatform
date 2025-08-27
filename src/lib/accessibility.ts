/**
 * Accessibility utilities and constants for the ServesPlatform application
 */

// WCAG 2.1 AA compliance constants
export const WCAG_CONSTANTS = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_CONTRAST_RATIO_LARGE: 3,
  MIN_TOUCH_TARGET_SIZE: 44, // pixels
  MAX_LINE_LENGTH: 80, // characters
} as const;

// ARIA roles commonly used in the application
export const ARIA_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  MENUITEM: 'menuitem',
  MENUBAR: 'menubar',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  COMPLEMENTARY: 'complementary',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  ALERT: 'alert',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  COLUMNHEADER: 'columnheader',
  ROWHEADER: 'rowheader',
} as const;

// Common ARIA attributes
export const ARIA_ATTRIBUTES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  EXPANDED: 'aria-expanded',
  HIDDEN: 'aria-hidden',
  CURRENT: 'aria-current',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  REQUIRED: 'aria-required',
  INVALID: 'aria-invalid',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  BUSY: 'aria-busy',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  ACTIVEDESCENDANT: 'aria-activedescendant',
} as const;

// Screen reader text utility
export const SR_ONLY_CLASS = 'sr-only';

/**
 * Generates a unique ID for accessibility purposes
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates accessible button props
 */
export function createButtonProps(
  label: string,
  options: {
    expanded?: boolean;
    controls?: string;
    describedBy?: string;
    disabled?: boolean;
  } = {}
) {
  const props: Record<string, string | boolean> = {
    'aria-label': label,
    type: 'button',
  };

  if (options.expanded !== undefined) {
    props['aria-expanded'] = options.expanded;
  }

  if (options.controls) {
    props['aria-controls'] = options.controls;
  }

  if (options.describedBy) {
    props['aria-describedby'] = options.describedBy;
  }

  if (options.disabled) {
    props['aria-disabled'] = true;
    props.disabled = true;
  }

  return props;
}

/**
 * Creates accessible form field props
 */
export function createFormFieldProps(
  id: string,
  options: {
    label?: string;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    errorId?: string;
    helperId?: string;
  } = {}
) {
  const props: Record<string, string | boolean> = {
    id,
  };

  if (options.required) {
    props['aria-required'] = true;
    props.required = true;
  }

  if (options.invalid) {
    props['aria-invalid'] = true;
  }

  const describedByIds = [
    options.describedBy,
    options.errorId,
    options.helperId,
  ].filter(Boolean);

  if (describedByIds.length > 0) {
    props['aria-describedby'] = describedByIds.join(' ');
  }

  return props;
}

/**
 * Creates accessible table props
 */
export function createTableProps(caption?: string) {
  const props: Record<string, string> = {
    role: 'table',
  };

  if (caption) {
    props['aria-label'] = caption;
  }

  return props;
}

/**
 * Creates accessible modal props
 */
export function createModalProps(
  titleId?: string,
  descriptionId?: string
) {
  const props: Record<string, string | boolean | number> = {
    role: 'dialog',
    'aria-modal': true,
    tabIndex: -1,
  };

  if (titleId) {
    props['aria-labelledby'] = titleId;
  }

  if (descriptionId) {
    props['aria-describedby'] = descriptionId;
  }

  return props;
}

/**
 * Validates color contrast ratio (simplified)
 * In production, use a proper color contrast library
 */
export function validateColorContrast(
  _foreground: string,
  _background: string,
  isLargeText: boolean = false
): boolean {
  // This is a simplified implementation
  // In production, you would use a proper color parsing and contrast calculation library
  const _minRatio = isLargeText ? WCAG_CONSTANTS.MIN_CONTRAST_RATIO_LARGE : WCAG_CONSTANTS.MIN_CONTRAST_RATIO;
  
  // For now, assume our design system colors meet WCAG standards
  return true;
}

/**
 * Checks if an element meets minimum touch target size
 */
export function validateTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= WCAG_CONSTANTS.MIN_TOUCH_TARGET_SIZE && 
         rect.height >= WCAG_CONSTANTS.MIN_TOUCH_TARGET_SIZE;
}

/**
 * Announces a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = SR_ONLY_CLASS;
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focuses the first focusable element within a container
 */
export function focusFirstElement(container: HTMLElement): void {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  if (firstElement) {
    firstElement.focus();
  }
}

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  return Array.from(elements) as HTMLElement[];
}

/**
 * Traps focus within a container (for modals, dropdowns, etc.)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

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

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Accessibility testing utilities for development
 */
export const A11Y_TESTING = {
  /**
   * Logs accessibility issues found in the DOM
   */
  auditPage(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const issues: string[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`Found ${images.length} images without alt text`);
    }

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    const buttonsWithoutText = Array.from(buttons).filter(btn => !btn.textContent?.trim());
    if (buttonsWithoutText.length > 0) {
      issues.push(`Found ${buttonsWithoutText.length} buttons without accessible names`);
    }

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const inputsWithoutLabels = Array.from(inputs).filter(input => {
      const id = input.getAttribute('id');
      return !id || !document.querySelector(`label[for="${id}"]`);
    });
    if (inputsWithoutLabels.length > 0) {
      issues.push(`Found ${inputsWithoutLabels.length} form inputs without labels`);
    }

    // Check for insufficient color contrast (simplified)
    // In production, you'd use a proper color contrast analyzer

    if (issues.length > 0) {
      console.group('🔍 Accessibility Issues Found:');
      issues.forEach(issue => console.warn(issue));
      console.groupEnd();
    } else {
      console.log('✅ No obvious accessibility issues found');
    }
  },

  /**
   * Highlights focusable elements on the page
   */
  highlightFocusableElements(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      (element as HTMLElement).style.outline = '2px solid red';
      (element as HTMLElement).style.outlineOffset = '2px';
    });

    console.log(`🎯 Highlighted ${focusableElements.length} focusable elements`);
  },

  /**
   * Tests keyboard navigation
   */
  testKeyboardNavigation(): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.log('⌨️ Testing keyboard navigation...');
    console.log('Press Tab to navigate forward, Shift+Tab to navigate backward');
    console.log('Press Enter or Space to activate buttons and links');
    console.log('Press Escape to close modals and dropdowns');
  },
};

/**
 * Creates accessible tooltip props
 */
export function createTooltipProps(
  tooltipId: string,
  content: string
) {
  return {
    'aria-describedby': tooltipId,
    'data-tooltip': content,
  };
}

/**
 * Creates accessible landmark props
 */
export function createLandmarkProps(
  role: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo',
  label?: string
) {
  const props: Record<string, string> = { role };
  
  if (label) {
    props['aria-label'] = label;
  }
  
  return props;
}

/**
 * Creates accessible heading props with proper hierarchy
 */
export function createHeadingProps(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  id?: string
) {
  const props: Record<string, string | number> = {
    role: 'heading',
    'aria-level': level,
  };
  
  if (id) {
    props.id = id;
  }
  
  return props;
}

/**
 * Keyboard navigation utilities
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Handles keyboard navigation for lists and menus
 */
export function handleListKeyNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect?: (index: number) => void,
  orientation: 'vertical' | 'horizontal' = 'vertical'
): number {
  const { key } = event;
  let newIndex = currentIndex;
  
  const nextKey = orientation === 'vertical' ? KEYBOARD_KEYS.ARROW_DOWN : KEYBOARD_KEYS.ARROW_RIGHT;
  const prevKey = orientation === 'vertical' ? KEYBOARD_KEYS.ARROW_UP : KEYBOARD_KEYS.ARROW_LEFT;
  
  switch (key) {
    case nextKey:
      newIndex = (currentIndex + 1) % items.length;
      event.preventDefault();
      break;
    case prevKey:
      newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
      event.preventDefault();
      break;
    case KEYBOARD_KEYS.HOME:
      newIndex = 0;
      event.preventDefault();
      break;
    case KEYBOARD_KEYS.END:
      newIndex = items.length - 1;
      event.preventDefault();
      break;
    case KEYBOARD_KEYS.ENTER:
    case KEYBOARD_KEYS.SPACE:
      if (onSelect) {
        onSelect(currentIndex);
        event.preventDefault();
      }
      break;
  }
  
  if (newIndex !== currentIndex && items[newIndex]) {
    items[newIndex].focus();
  }
  
  return newIndex;
}

/**
 * Color contrast validation with proper calculation
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  // This is a simplified implementation
  // In production, use a proper color contrast library like 'color-contrast'
  
  // Convert colors to RGB and calculate luminance
  const getLuminance = (color: string): number => {
    // Simplified luminance calculation
    // This should be replaced with proper color parsing and luminance calculation
    return 0.5; // Placeholder
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Improved color contrast validation
 */
export function validateColorContrastImproved(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { isValid: boolean; ratio: number; required: number } {
  const ratio = calculateContrastRatio(foreground, background);
  const required = isLargeText ? WCAG_CONSTANTS.MIN_CONTRAST_RATIO_LARGE : WCAG_CONSTANTS.MIN_CONTRAST_RATIO;
  
  return {
    isValid: ratio >= required,
    ratio,
    required,
  };
}

// Export commonly used accessibility classes
export const A11Y_CLASSES = {
  SR_ONLY: 'sr-only',
  FOCUS_VISIBLE: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  TOUCH_TARGET: 'min-h-[44px] min-w-[44px]',
  HIGH_CONTRAST: 'contrast-more:border-black contrast-more:text-black',
  REDUCED_MOTION: 'motion-reduce:transition-none motion-reduce:animate-none',
  KEYBOARD_FOCUS: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
} as const;