'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTooltip } from '@/lib/hooks/useAccessibility';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 500,
  disabled = false,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { tooltipId } = useTooltip();

  const showTooltip = () => {
    if (disabled || !content) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipElement = tooltipRef.current;
    
    if (!tooltipElement) return;

    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = 0;
    let y = 0;
    
    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + 8;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }
    
    // Adjust for viewport boundaries
    if (x < 8) x = 8;
    if (x + tooltipRect.width > viewportWidth - 8) {
      x = viewportWidth - tooltipRect.width - 8;
    }
    if (y < 8) y = 8;
    if (y + tooltipRect.height > viewportHeight - 8) {
      y = viewportHeight - tooltipRect.height - 8;
    }
    
    setPosition({ x, y });
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone the child element and add tooltip props
  const childElement = React.cloneElement(children, {
    ref: triggerRef,
    'aria-describedby': isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      children.props.onBlur?.(e);
    },
  });

  const tooltipElement = isVisible && (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={`
        fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg
        max-w-xs break-words pointer-events-none
        ${className}
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {content}
      {/* Arrow */}
      <div
        className={`
          absolute w-2 h-2 bg-gray-900 transform rotate-45
          ${placement === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${placement === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${placement === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
          ${placement === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
        `}
      />
    </div>
  );

  return (
    <>
      {childElement}
      {typeof window !== 'undefined' && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}

// Helper component for tooltip trigger
interface TooltipTriggerProps {
  tooltip: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function TooltipTrigger({ tooltip, children, placement, className }: TooltipTriggerProps) {
  return (
    <Tooltip content={tooltip} placement={placement} className={className}>
      <span className="inline-block">{children}</span>
    </Tooltip>
  );
}