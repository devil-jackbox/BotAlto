# 🚀 Free Platform Deployment Guide

This guide shows you how to deploy BotAlto on various free hosting platforms.

## 📋 Platform Comparison

| Platform | Free Tier | Database | Redis | Docker | Best For |
|----------|-----------|----------|-------|--------|----------|
| **Railway** | ✅ $5/month | ✅ PostgreSQL | ✅ Redis | ✅ | **Recommended** |
| **Render** | ✅ Free | ✅ PostgreSQL | ✅ Redis | ✅ | Good alternative |
| **Heroku** | ❌ $7/month | ✅ PostgreSQL | ✅ Redis | ✅ | Legacy support |
| **Vercel** | ✅ Free | ❌ External | ❌ External | ❌ | Frontend only |
| **Netlify** | ✅ Free | ❌ External | ❌ External | ❌ | Frontend only |

## 🎯 Recommended: Railway Deployment

Railway is the best free option for BotAlto because it supports:
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Docker containers
- ✅ Custom domains
- ✅ SSL certificates
- ✅ Environment variables
- ✅ Real-time logs

### Quick Deploy to Railway

#### Option 1: One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/your-username/botalto-platform)

#### Option 2: Manual Deployment

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Clone and deploy**:
   ```bash
   git clone https://github.com/your-username/botalto-platform.git
   cd botalto-platform
   chmod +x railway-deploy.sh
   ./railway-deploy.sh
   ```

#### Option 3: Step-by-Step Manual

1. **Create Railway project**:
   ```bash
   railway init --name botalto-platform
   ```

2. **Add PostgreSQL**:
   ```bash
   railway add postgresql
   ```

3. **Add Redis**:
   ```bash
   railway add redis
   ```

4. **Set environment variables**:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set API_PREFIX=api/v1
   railway variables set JWT_SECRET=$(openssl rand -base64 32)
   railway variables set BCRYPT_ROUNDS=12
   railway variables set LOG_LEVEL=info
   ```

5. **Get database credentials**:
   ```bash
   railway variables --service postgresql
   railway variables --service redis
   ```

6. **Set database variables** (replace with actual values):
   ```bash
   railway variables set DB_HOST=your-postgres-host
   railway variables set DB_PORT=5432
   railway variables set DB_USERNAME=your-postgres-user
   railway variables set DB_PASSWORD=your-postgres-password
   railway variables set DB_DATABASE=your-postgres-database
   ```

7. **Set Redis variables** (replace with actual values):
   ```bash
   railway variables set REDIS_HOST=your-redis-host
   railway variables set REDIS_PORT=6379
   railway variables set REDIS_PASSWORD=your-redis-password
   ```

8. **Deploy**:
   ```bash
   railway up
   ```

9. **Setup database**:
   ```bash
   railway run npm run db:migrate
   railway run npm run db:seed
   ```

10. **Get your URL**:
    ```bash
    railway open
    ```

### Railway Environment Variables

Create a `.env` file for local development:
```env
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
JWT_SECRET=your-jwt-secret
BCRYPT_ROUNDS=12
LOG_LEVEL=info

# Database (get from Railway dashboard)
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=your-postgres-user
DB_PASSWORD=your-postgres-password
DB_DATABASE=your-postgres-database

# Redis (get from Railway dashboard)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## 🎨 Render Deployment

Render is another excellent free option with similar features to Railway.

### Quick Deploy to Render

1. **Fork the repository** to your GitHub account

2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New +" → "Blueprint"

3. **Deploy from repository**:
   - Select your forked repository
   - Render will automatically detect the `render.yaml` configuration
   - Click "Apply"

4. **Wait for deployment** (5-10 minutes)

5. **Access your app**:
   - Go to your Render dashboard
   - Click on your service
   - Copy the URL

### Manual Render Setup

1. **Create Web Service**:
   - Name: `botalto-backend`
   - Environment: `Node`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start:prod`

2. **Add PostgreSQL**:
   - Create new PostgreSQL service
   - Name: `botalto-postgres`
   - Plan: Free

3. **Add Redis**:
   - Create new Redis service
   - Name: `botalto-redis`
   - Plan: Free

4. **Set environment variables**:
   ```env
   NODE_ENV=production
   PORT=3000
   API_PREFIX=api/v1
   JWT_SECRET=your-jwt-secret
   BCRYPT_ROUNDS=12
   LOG_LEVEL=info
   ```

5. **Link services** and set database variables

## 🐳 Heroku Deployment

Heroku no longer has a free tier, but here's how to deploy if you have a paid account.

### Deploy to Heroku

1. **Install Heroku CLI**:
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   
   # Linux
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create Heroku app**:
   ```bash
   heroku create your-botalto-app
   ```

4. **Add PostgreSQL**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

5. **Add Redis**:
   ```bash
   heroku addons:create heroku-redis:mini
   ```

6. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=$(openssl rand -base64 32)
   heroku config:set BCRYPT_ROUNDS=12
   heroku config:set LOG_LEVEL=info
   ```

7. **Deploy**:
   ```bash
   git push heroku main
   ```

8. **Run migrations**:
   ```bash
   heroku run npm run db:migrate
   heroku run npm run db:seed
   ```

9. **Open app**:
   ```bash
   heroku open
   ```

## ⚡ Vercel Deployment (Frontend Only)

Vercel is great for frontend deployment but doesn't support databases or Redis.

### Deploy Frontend to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

3. **Set environment variables**:
   ```bash
   vercel env add REACT_APP_API_URL
   vercel env add REACT_APP_WS_URL
   ```

### Use External Database

For Vercel, you'll need external database services:

- **Database**: [Supabase](https://supabase.com) (free tier)
- **Redis**: [Upstash](https://upstash.com) (free tier)

## 🌐 Netlify Deployment (Frontend Only)

Similar to Vercel, Netlify is for frontend only.

### Deploy to Netlify

1. **Build frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**:
   - Drag and drop the `build` folder to [netlify.com](https://netlify.com)
   - Or use Netlify CLI:
     ```bash
     npm install -g netlify-cli
     netlify deploy --prod --dir=build
     ```

## 🔧 Environment Variables for All Platforms

### Required Variables
```env
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12
LOG_LEVEL=info

# Database
DB_HOST=your-database-host
DB_PORT=5432
DB_USERNAME=your-database-user
DB_PASSWORD=your-database-password
DB_DATABASE=your-database-name

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Optional Variables
```env
# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

## 🚀 Post-Deployment Setup

### 1. Access Your Application
- **Railway**: `https://your-app-name.railway.app`
- **Render**: `https://your-app-name.onrender.com`
- **Heroku**: `https://your-app-name.herokuapp.com`

### 2. Default Admin Login
- **Email**: `admin@botalto.com`
- **Password**: `admin123`

### 3. Health Check
Visit: `https://your-app-url/api/v1/health`

### 4. API Documentation
Visit: `https://your-app-url/api/v1`

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
railway logs --service postgresql
# or
heroku logs --tail --app your-app-name
```

#### Redis Connection Errors
```bash
# Check Redis status
railway logs --service redis
# or
heroku redis:info --app your-app-name
```

#### Build Failures
```bash
# Check build logs
railway logs
# or
heroku logs --tail --app your-app-name
```

#### Environment Variables
```bash
# Check variables
railway variables
# or
heroku config --app your-app-name
```

### Performance Optimization

#### For Free Tiers
1. **Enable caching**:
   ```env
   REDIS_CACHE_TTL=3600
   ```

2. **Optimize database queries**:
   - Use indexes
   - Limit result sets
   - Implement pagination

3. **Reduce memory usage**:
   ```env
   NODE_OPTIONS="--max-old-space-size=512"
   ```

4. **Use connection pooling**:
   ```env
   DB_POOL_SIZE=5
   ```

## 📊 Monitoring Free Deployments

### Railway Monitoring
- Built-in metrics dashboard
- Real-time logs
- Performance monitoring

### Render Monitoring
- Built-in metrics
- Log aggregation
- Health checks

### External Monitoring
- [UptimeRobot](https://uptimerobot.com) - Free uptime monitoring
- [Better Stack](https://betterstack.com) - Free log management
- [Grafana Cloud](https://grafana.com) - Free metrics

## 🔄 Continuous Deployment

### GitHub Actions (Free)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: railway/deploy@v1
        with:
          service: your-railway-service
```

## 💡 Tips for Free Deployments

1. **Use free database services**:
   - Railway PostgreSQL (free tier)
   - Render PostgreSQL (free tier)
   - Supabase (free tier)

2. **Use free Redis services**:
   - Railway Redis (free tier)
   - Render Redis (free tier)
   - Upstash Redis (free tier)

3. **Optimize for cold starts**:
   - Keep dependencies minimal
   - Use efficient build processes
   - Implement proper caching

4. **Monitor usage limits**:
   - Railway: $5/month free tier
   - Render: Free tier with limitations
   - Heroku: $7/month minimum

5. **Backup your data**:
   - Export database regularly
   - Use version control for code
   - Document your setup

## 🆘 Support

### Platform Support
- **Railway**: [Discord](https://discord.gg/railway)
- **Render**: [Documentation](https://render.com/docs)
- **Heroku**: [Support](https://help.heroku.com)

### BotAlto Support
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Community support
- **Email**: support@botalto.com

---

**Happy Deploying! 🚀**

Choose Railway for the best free experience with BotAlto!