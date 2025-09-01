/**
 * Development Mode Configuration
 * Handles localhost development with mock data to avoid CORS issues
 */

export const isDevelopmentMode = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.includes('localhost'));
};

export const shouldUseMockData = (): boolean => {
  // Check if we should force real API usage via environment variable
  const forceRealAPI = process.env.NEXT_PUBLIC_FORCE_REAL_API === 'true';
  
  console.log('🔍 [DEBUG] NEXT_PUBLIC_FORCE_REAL_API:', process.env.NEXT_PUBLIC_FORCE_REAL_API);
  console.log('🔍 [DEBUG] forceRealAPI:', forceRealAPI);
  console.log('🔍 [DEBUG] isDevelopmentMode():', isDevelopmentMode());
  
  if (forceRealAPI) {
    console.log('🔗 [FORCE REAL API] Using real Google Sheets API instead of mock data');
    return false;
  }
  
  // TEMPORARY: Force real API for testing
  console.log('🔗 [TEMPORARY FORCE] Using real Google Sheets API for testing');
  return false;
  
  // Use mock data in development to avoid CORS issues with Google Apps Script
  // return isDevelopmentMode();
};

export const logDevelopmentMode = (service: string, action: string): void => {
  if (isDevelopmentMode()) {
    console.log(`🎭 [DEV MODE] ${service}: Using mock data for ${action} (avoiding CORS issues)`);
  }
};