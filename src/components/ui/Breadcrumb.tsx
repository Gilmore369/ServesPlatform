'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav 
      className={`flex ${className}`} 
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2 text-sm">
        {/* Home link */}
        <li>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-500 transition-colors"
            aria-label="Ir al dashboard"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="h-4 w-4 text-gray-300 mx-2" />
            
            {item.current || !item.href ? (
              <span 
                className="text-gray-900 font-medium"
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}