// Application configuration
import { AppConfig } from './types';

export const config: AppConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  apiToken: process.env.NEXT_PUBLIC_API_TOKEN || '',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'ServesPlatform',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_API_TOKEN',
  ];

  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}