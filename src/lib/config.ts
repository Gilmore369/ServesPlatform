// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://script.google.com/macros/s/AKfycbyyi5RtzRcodSArUVUH5G82jf_8rkD5_SKX8VqV31WtoA93YZk7hgcE3ciCXzLue46wLg/exec',
  TOKEN: process.env.NEXT_PUBLIC_API_TOKEN || 'demo-token-2024',
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
};

// Helper function to build API URL with token
export function buildApiUrl(action: string, additionalParams?: Record<string, string>): string {
  const url = new URL(API_CONFIG.BASE_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', API_CONFIG.TOKEN);
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

// Helper function for API requests
export async function makeApiRequest(action: string, options: {
  method?: 'GET' | 'POST';
  body?: any;
  additionalParams?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, additionalParams } = options;
  
  const url = buildApiUrl(action, additionalParams);
  
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body && method === 'POST') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}