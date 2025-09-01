/**
 * Client-side Configuration
 * Configuration that works in the browser environment
 */

// Client-side configuration that works in the browser
export const CLIENT_CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyyi5RtzRcodSArUVUH5G82jf_8rkD5_SKX8VqV31WtoA93YZk7hgcE3ciCXzLue46wLg/exec', // Reemplaza con tu nueva URL si es necesario
  API_TOKEN: 'demo-token-2024'
};

/**
 * Get API base URL for client-side use
 */
export function getClientApiBaseUrl(): string {
  // Try to get from window object if available (set by Next.js)
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_API_BASE_URL) {
    const envUrl = (window as any).__NEXT_DATA__.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl && !envUrl.includes('Your_Script_ID_Here')) {
      return envUrl;
    }
  }
  
  // Fallback to hardcoded URL
  return CLIENT_CONFIG.API_BASE_URL;
}

/**
 * Get API token for client-side use
 */
export function getClientApiToken(): string {
  // Try to get from window object if available
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_API_TOKEN) {
    return (window as any).__NEXT_DATA__.env.NEXT_PUBLIC_API_TOKEN;
  }
  
  // Fallback to hardcoded token
  return CLIENT_CONFIG.API_TOKEN;
}

/**
 * Client-side configuration object
 */
export const clientConfig = {
  api: {
    baseUrl: getClientApiBaseUrl(),
    token: getClientApiToken(),
    timeout: 30000,
    retryAttempts: 3
  },
  
  logging: {
    enabled: true,
    level: 'INFO' as const
  },
  
  features: {
    enhancedApiClient: true,
    offlineSupport: true,
    realTimeSync: true
  }
};

// Log configuration for debugging
if (typeof window !== 'undefined') {
  console.log('🔍 Client Config initialized:');
  console.log('  API Base URL:', clientConfig.api.baseUrl);
  console.log('  API Token:', clientConfig.api.token);
}