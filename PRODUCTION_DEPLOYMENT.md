# Production Deployment Guide

## Overview

This guide covers the complete deployment process for ServesPlatform to production environments.

## Pre-deployment Checklist

### 1. Code Quality
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] System validation passed (`npm run validate`)

### 2. Environment Configuration
- [ ] Production environment variables configured
- [ ] Google Apps Script deployed and tested
- [ ] API endpoints accessible
- [ ] Security headers configured

### 3. Performance Optimization
- [ ] Bundle analysis completed (`npm run build:analyze`)
- [ ] Images optimized
- [ ] Unused dependencies removed
- [ ] Code splitting implemented

## Deployment Steps

### Step 1: Prepare Google Apps Script Backend

1. **Deploy Google Apps Script**
   ```bash
   # Navigate to Google Apps Script project
   cd ../google-apps-script
   
   # Follow deployment instructions in DEPLOYMENT_GUIDE.md
   ```

2. **Configure Script Properties**
   - Set `SHEET_ID` to your production Google Sheet ID
   - Set `API_TOKEN` to a secure random token
   - Set `JWT_SECRET` to a secure random string
   - Set `ENVIRONMENT` to "production"

3. **Test API Endpoints**
   ```bash
   # Test authentication
   curl -X POST "YOUR_SCRIPT_URL" \
     -H "Content-Type: application/json" \
     -d '{"action": "auth", "email": "admin@serves.com", "password": "your-password"}'
   ```

### Step 2: Configure Frontend Environment

1. **Create Production Environment File**
   ```bash
   cp .env.production .env.local
   ```

2. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_API_BASE=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   NEXT_PUBLIC_API_TOKEN=your-production-api-token
   NEXT_PUBLIC_APP_NAME=ServesPlatform
   NEXT_PUBLIC_APP_VERSION=1.0.0
   NEXT_PUBLIC_ENVIRONMENT=production
   ```

### Step 3: Build and Test

1. **Run Comprehensive Production Check**
   ```bash
   npm run production-check
   ```
   This command runs:
   - System validation
   - Full test suite
   - Production build
   - Bundle optimization analysis

2. **Alternative: Manual Steps**
   ```bash
   npm run validate          # System validation
   npm run test             # Full test suite
   npm run type-check       # TypeScript validation
   npm run lint             # Code linting
   npm run build            # Production build
   npm run optimize         # Bundle optimization
   ```

3. **Test Production Build Locally**
   ```bash
   npm start
   # Test at http://localhost:3000
   ```

4. **Run Performance Monitoring**
   ```bash
   npm run monitor:performance
   npm run health-check
   ```

### Step 4: Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy (Automated)**
   ```bash
   npm run deploy:production
   ```
   This runs the complete deployment pipeline with validation.

   **Alternative: Manual Deploy**
   ```bash
   npm run deploy:vercel
   ```

4. **Configure Environment Variables in Vercel**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add all production environment variables

### Step 5: Post-deployment Verification

1. **Verify Deployment**
   - [ ] Application loads correctly
   - [ ] Authentication works
   - [ ] API endpoints respond
   - [ ] All modules functional

2. **Performance Check**
   - [ ] Lighthouse score > 90
   - [ ] Core Web Vitals pass
   - [ ] Load time < 3 seconds

3. **Security Check**
   - [ ] HTTPS enabled
   - [ ] Security headers present
   - [ ] No sensitive data exposed

## Monitoring and Maintenance

### Health Monitoring

1. **Health Check Endpoint**
   ```
   GET /api/health
   ```

2. **Monitoring Setup**
   - Configure uptime monitoring (e.g., UptimeRobot)
   - Set up error tracking (e.g., Sentry)
   - Monitor performance metrics

### Production Monitoring Features

1. **Structured Logging**
   - All application events logged in JSON format
   - Configurable log levels (ERROR, WARN, INFO, DEBUG)
   - Remote logging to external services

2. **Performance Monitoring**
   - Core Web Vitals tracking (LCP, FID, CLS)
   - API response time monitoring
   - Component render performance
   - Memory usage tracking

3. **Error Monitoring**
   - Automatic error reporting
   - Unhandled exception tracking
   - Component error boundaries
   - User action context

4. **Analytics Integration**
   - User interaction tracking
   - Performance metrics collection
   - Custom event tracking

### Monitoring Commands

```bash
# Monitor application logs
npm run monitor:logs

# Run performance monitoring
npm run monitor:performance

# Check system health
npm run health-check

# Validate system configuration
npm run validate

# Analyze bundle size
npm run build:analyze
```

### Backup Strategy

1. **Google Sheets Backup**
   - Regular automated backups
   - Version control for data
   - Recovery procedures documented

2. **Code Backup**
   - Git repository with tags for releases
   - Deployment artifacts stored
   - Rollback procedures ready

### Update Process

1. **Staging Environment**
   - Test all changes in staging first
   - Run full test suite
   - Performance testing

2. **Production Updates**
   - Use blue-green deployment
   - Monitor during deployment
   - Have rollback plan ready

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   npm run clean
   npm install
   npm run build
   ```

2. **API Connection Issues**
   - Verify Google Apps Script URL
   - Check API token configuration
   - Validate CORS settings

3. **Performance Issues**
   - Run bundle analyzer: `npm run build:analyze`
   - Check for large dependencies
   - Optimize images and assets

### Rollback Procedure

1. **Immediate Rollback**
   ```bash
   # Revert to previous Vercel deployment
   vercel --prod --force
   ```

2. **Code Rollback**
   ```bash
   git revert <commit-hash>
   npm run deploy:vercel
   ```

## Security Considerations

### Production Security Checklist

- [ ] Environment variables secured
- [ ] API tokens rotated regularly
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Input validation implemented
- [ ] Rate limiting enabled
- [ ] Audit logs configured

### Security Headers

The following security headers are automatically configured:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-XSS-Protection: 1; mode=block`

## Performance Optimization

### Bundle Optimization

1. **Analyze Bundle Size**
   ```bash
   npm run build:analyze
   ```

2. **Optimization Techniques**
   - Code splitting by routes
   - Dynamic imports for heavy components
   - Tree shaking for unused code
   - Image optimization with Next.js

### Caching Strategy

1. **Static Assets**
   - Long-term caching for immutable assets
   - Versioned filenames for cache busting

2. **API Responses**
   - Appropriate cache headers
   - CDN configuration for static content

## Compliance and Documentation

### Documentation Requirements

- [ ] API documentation updated
- [ ] User manual current
- [ ] Admin guide available
- [ ] Deployment procedures documented

### Compliance Checklist

- [ ] GDPR compliance (if applicable)
- [ ] Accessibility standards (WCAG 2.1 AA)
- [ ] Security standards met
- [ ] Performance benchmarks achieved

## Support and Maintenance

### Support Contacts

- **Technical Lead**: [Contact Information]
- **DevOps**: [Contact Information]
- **Product Owner**: [Contact Information]

### Maintenance Schedule

- **Daily**: Health checks, monitoring alerts
- **Weekly**: Performance reviews, security scans
- **Monthly**: Dependency updates, security patches
- **Quarterly**: Full system audit, disaster recovery testing

## Conclusion

Following this deployment guide ensures a secure, performant, and maintainable production deployment of ServesPlatform. Regular monitoring and maintenance are essential for continued success.

For questions or issues, refer to the troubleshooting section or contact the support team.