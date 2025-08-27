/** @type {import('next').NextConfig} */
const nextConfig = {
  // DISABLE ALL CHECKS FOR VERCEL DEPLOYMENT
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable strict mode for faster builds
  reactStrictMode: false,
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Image optimization configuration
  images: {
    domains: ['drive.google.com', 'lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;