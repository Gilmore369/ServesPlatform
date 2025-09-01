/**
 * Emergency Configuration Override
 * Forces the correct API URL when environment variables fail
 */

import { getClientApiBaseUrl, getClientApiToken } from './client-config';

// Force the correct API URL
export const EMERGENCY_CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyyi5RtzRcodSArUVUH5G82jf_8rkD5_SKX8VqV31WtoA93YZk7hgcE3ciCXzLue46wLg/exec',
  API_TOKEN: 'demo-token-2024'
};

// Override config if needed
export function getApiBaseUrl(): string {
  // Use client-side configuration
  const clientUrl = getClientApiBaseUrl();
  
  console.log('🔍 Emergency Config Check:');
  console.log('  Client URL:', clientUrl);
  console.log('  Emergency URL:', EMERGENCY_CONFIG.API_BASE_URL);
  
  return clientUrl;
}

export function getApiToken(): string {
  // Use client-side configuration
  const clientToken = getClientApiToken();
  
  console.log('🔍 Using client token:', clientToken);
  
  return clientToken;
}