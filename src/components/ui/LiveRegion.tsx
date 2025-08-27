'use client';

import React from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export function LiveRegion({ 
  message, 
  priority = 'polite', 
  className = '' 
}: LiveRegionProps) {
  if (!message) return null;

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role={priority === 'assertive' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}

// Global live region for application-wide announcements
export function GlobalLiveRegion() {
  return (
    <>
      <div
        id="polite-announcements"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      <div
        id="assertive-announcements"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
    </>
  );
}

// Utility function to announce messages globally
export function announceGlobally(
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
) {
  const regionId = priority === 'assertive' ? 'assertive-announcements' : 'polite-announcements';
  const region = document.getElementById(regionId);
  
  if (region) {
    // Clear first to ensure re-announcement
    region.textContent = '';
    
    // Set message after brief delay
    setTimeout(() => {
      region.textContent = message;
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 5000);
  }
}