# LexiSense Deployment Guide

This guide covers deploying LexiSense to production using Vercel (frontend) and Render (backend).

## Architecture

- **Frontend**: React SPA hosted on Vercel
- **Backend**: Node.js/Express API hosted on Render
- **Database**: PostgreSQL (Neon or Render PostgreSQL)
- **Storage**: AWS S3 for contract files
- **Logging**: Winston with daily rotating file logs

## Prerequisites

1. **Accounts Required**:
   - Vercel account (https://vercel.com)
   - Render account (https://render.com)
   - AWS account with S3 bucket created
   - Neon account (https://neon.tech) or Render PostgreSQL
   - OpenAI API key (https://platform.openai.com)

2. **AWS S3 Setup**:
   ```bash
   # Create S3 bucket
   aws s3api create-bucket --bucket lexisense-contracts --region us-east-1
   
   # Configure CORS
   aws s3api put-bucket-cors --bucket lexisense-contracts --cors-configuration file://s3-cors.json
   ```

3. **Environment Variables**:
   - See `.env.example` for required variables
   - Generate SESSION_SECRET: `openssl rand -base64 32`

## Backend Deployment (Render)

### Option 1: Using render.yaml (Recommended)

1. Push code to GitHub
2. Connect repository to Render
3. Render will auto-detect `render.yaml` configuration
4. Set environment variables in Render dashboard:
   - `DATABASE_URL`: PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `AWS_ACCESS_KEY_ID`: AWS credentials
   - `AWS_SECRET_ACCESS_KEY`: AWS credentials
   - `S3_BUCKET_NAME`: Your S3 bucket name

### Option 2: Manual Setup

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Name**: lexisense-api
   - **Environment**: Node
   - **Region**: Oregon (or closest to your users)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Starter or higher

4. Add environment variables (see above)

5. Add Health Check:
   - **Path**: `/health`
   - **Expected Status**: 200

### Database Setup (Render PostgreSQL)

1. Create a PostgreSQL database on Render
2. Copy the connection string (Internal Database URL)
3. Use as DATABASE_URL environment variable
4. Run database setup:
   ```bash
   # After first deployment, use Render shell
   npm run db:setup
   ```

### Verify Backend

Once deployed, test the API:
```bash
curl https://lexisense-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T...",
  "uptime": {...},
  "system": {...},
  "database": {"status": "healthy", "responseTime": "..."},
  ...
}
```

## Frontend Deployment (Vercel)

### Option 1: Using vercel.json (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. The `vercel.json` configuration will:
   - Build the React client
   - Route API calls to your Render backend
   - Serve the SPA with proper fallback

### Option 2: Vercel Dashboard

1. Go to Vercel dashboard (https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `dist/client`
   - **Install Command**: `npm install`

5. Environment Variables:
   - `NODE_ENV`: production

6. Deploy

### Update API Endpoint in vercel.json

Edit `vercel.json` and replace the backend URL:
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-actual-backend.onrender.com/api/$1"
    },
    ...
  ]
}
```

### Verify Frontend

Visit your Vercel URL (e.g., `https://lexisense.vercel.app`)

## Post-Deployment Steps

### 1. Update CORS Settings

If frontend and backend are on different domains, update backend CORS:

```typescript
// server/index.ts
app.use(cors({
  origin: ['https://lexisense.vercel.app'],
  credentials: true,
}))
```

### 2. Set Up Custom Domain (Optional)

**Vercel**:
1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

**Render**:
1. Go to Service Settings > Custom Domain
2. Add your API subdomain (e.g., api.lexisense.com)
3. Update DNS records

### 3. Enable HTTPS

Both Vercel and Render provide automatic HTTPS.

### 4. Configure Database Backups

**Render PostgreSQL**:
- Backups are automatic on paid plans
- For free tier, export manually:
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

### 5. Set Up Monitoring

**Backend Monitoring** (Render):
- Use Render's built-in metrics
- Health check endpoint: `/health`
- Error logs available in Render dashboard

**Application Monitoring**:
- Winston logs are available in Render shell
- Consider adding:
  - Sentry for error tracking
  - LogDNA/Datadog for log aggregation
  - New Relic/AppDynamics for APM

### 6. Set Up Alerts

Configure alerts in Render for:
- Service downtime
- High error rates
- Database connection issues

## Environment Variables Summary

### Backend (Render)

**Required**:
- `NODE_ENV`: production
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `SESSION_SECRET`: Random secret key
- `AWS_ACCESS_KEY_ID`: AWS credentials
- `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `AWS_REGION`: us-east-1 (or your region)
- `S3_BUCKET_NAME`: Your S3 bucket name

**Optional**:
- `PORT`: 3000 (auto-set by Render)
- `LOG_LEVEL`: info

### Frontend (Vercel)

- `NODE_ENV`: production

## Scaling Considerations

### Performance Optimization

1. **Enable Redis Rate Limiting** (Task #4):
   - Create Redis instance on Render
   - Update rate limiting to use Redis store

2. **Enable Caching** (Task #11):
   - Add Redis caching for frequent queries
   - Cache contract lists, user data

3. **CDN for Static Assets**:
   - Vercel automatically provides CDN
   - For S3 files, consider CloudFront

### Database Scaling

1. **Connection Pooling**:
   - Already configured with pg pool
   - Adjust pool size based on load

2. **Read Replicas**:
   - Available on Render Pro plan
   - Use for analytics queries

3. **Indexes**:
   ```sql
   CREATE INDEX idx_contracts_user_id ON contracts(user_id);
   CREATE INDEX idx_contracts_status ON contracts(status);
   CREATE INDEX idx_contracts_created_at ON contracts(created_at);
   ```

## Troubleshooting

### Backend Issues

**Service won't start**:
1. Check Render logs for errors
2. Verify all environment variables are set
3. Test database connection
4. Check build logs for compilation errors

**Database connection errors**:
1. Verify DATABASE_URL is correct
2. Check database is running
3. Verify network/firewall settings
4. Test connection from Render shell:
   ```bash
   psql $DATABASE_URL
   ```

**S3 upload failures**:
1. Verify AWS credentials
2. Check S3 bucket permissions
3. Ensure bucket exists in correct region
4. Review CloudWatch logs

### Frontend Issues

**API calls failing**:
1. Check `vercel.json` routes configuration
2. Verify backend URL is correct
3. Check CORS settings on backend
4. Test API directly with curl

**Build failures**:
1. Check Vercel build logs
2. Verify `build:client` script works locally
3. Check for TypeScript errors
4. Clear Vercel cache and redeploy

## Maintenance

### Regular Tasks

1. **Monitor Logs**:
   - Review error logs weekly
   - Check performance metrics

2. **Update Dependencies**:
   ```bash
   npm audit
   npm update
   ```

3. **Database Maintenance**:
   - Review slow queries
   - Optimize indexes
   - Clean up old logs

4. **Security Updates**:
   - Keep Node.js version updated
   - Apply security patches promptly
   - Rotate secrets periodically

### Backup Strategy

1. **Database**: Daily automated backups (Render Pro)
2. **S3 Files**: Enable versioning
3. **Code**: Git repository
4. **Environment Variables**: Document in secure location

## Cost Estimation

### Render (Backend)

- **Starter Plan**: $7/month
  - 512 MB RAM
  - 0.5 CPU
  - Suitable for MVP

- **PostgreSQL**: 
  - Free tier: 1 GB
  - Paid: $7/month for 1 GB

### Vercel (Frontend)

- **Hobby**: Free
  - 100 GB bandwidth
  - Suitable for MVP

- **Pro**: $20/month
  - 1 TB bandwidth
  - Better performance

### AWS S3

- **Storage**: ~$0.023/GB/month
- **Requests**: $0.0004/1000 PUT, $0.00004/1000 GET
- **Transfer**: $0.09/GB after first 1 GB

**Estimated monthly cost for MVP**: $15-30

## Support

For issues or questions:
- Check server logs: Render dashboard
- Review frontend logs: Vercel dashboard
- Check health endpoint: `/api/health`
- Review Winston logs: `logs/` directory (via Render shell)

## Next Steps After Deployment

1. ✅ Complete Task #4: Redis rate limiting
2. ✅ Complete Task #5: Email templates
3. ✅ Complete Task #7: Wire remaining frontend pages
4. ✅ Complete Task #10: Background cleanup job
5. Monitor performance and optimize
6. Set up CI/CD pipelines
7. Add comprehensive tests
8. Configure monitoring and alerts
