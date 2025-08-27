'use client';

import React from 'react';

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Saltar al contenido principal' },
  { href: '#main-navigation', label: 'Saltar a la navegación' },
  { href: '#search', label: 'Saltar a la búsqueda' },
];

export function SkipLinks({ links = defaultLinks, className = '' }: SkipLinksProps) {
  const handleSkipClick = (href: string) => {
    const target = document.querySelector(href);
    if (target) {
      // Focus the target element
      (target as HTMLElement).focus();
      
      // Scroll into view
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav 
      className={`skip-links ${className}`}
      aria-label="Enlaces de navegación rápida"
    >
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          onClick={(e) => {
            e.preventDefault();
            handleSkipClick(link.href);
          }}
          className="
            sr-only focus:not-sr-only
            absolute top-0 left-0 z-50
            bg-blue-600 text-white
            px-4 py-2 rounded-br-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-all duration-200
            hover:bg-blue-700
            text-sm font-medium
          "
          style={{
            left: `${index * 8}rem`, // Offset each link
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

// Hook for managing skip links
export function useSkipLinks() {
  const skipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const skipToNavigation = () => {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const skipToSearch = () => {
    const search = document.getElementById('search');
    if (search) {
      search.focus();
      search.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    skipToContent,
    skipToNavigation,
    skipToSearch,
  };
}