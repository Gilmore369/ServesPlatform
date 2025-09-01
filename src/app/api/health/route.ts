import { NextResponse } from 'next/server';
import { API_CONFIG, makeApiRequest } from '@/lib/config';

export async function GET() {
  try {
    // Debug log
    console.log('API_BASE_URL:', API_CONFIG.BASE_URL);
    console.log('API_TOKEN:', API_CONFIG.TOKEN);
    
    const data = await makeApiRequest('health');
    
    return NextResponse.json({
      ...data,
      frontend_status: 'healthy',
      api_url: API_CONFIG.BASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json(
      { 
        ok: false,
        error: 'Error en health check',
        message: error.message,
        frontend_status: 'error',
        api_url: API_CONFIG.BASE_URL,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}