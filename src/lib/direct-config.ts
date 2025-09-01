/**
 * Direct Configuration Values
 * Bypasses complex configuration logic for immediate use
 */

// Direct configuration values
export const directConfig = {
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbyyi5RtzRcodSArUVUH5G82jf_8rkD5_SKX8VqV31WtoA93YZk7hgcE3ciCXzLue46wLg/exec',
  apiToken: 'demo-token-2024'
};

// Export for backward compatibility
export const config = {
  api: {
    baseUrl: directConfig.apiBaseUrl,
    token: directConfig.apiToken
  },
  apiBaseUrl: directConfig.apiBaseUrl,
  apiToken: directConfig.apiToken
};

console.log('🔧 Direct config loaded:', {
  apiBaseUrl: directConfig.apiBaseUrl,
  apiToken: directConfig.apiToken
});