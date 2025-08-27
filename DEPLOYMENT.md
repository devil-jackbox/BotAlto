# BotAlto Platform Deployment Guide

This guide provides comprehensive instructions for deploying the BotAlto platform in different environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [SSL Configuration](#ssl-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup Strategy](#backup-strategy)
8. [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Git

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/botalto-platform.git
cd botalto-platform

# Run the setup script
./scripts/setup.sh
```

### Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Start services
docker-compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Access the platform
# Frontend: http://localhost:3001
# Backend: http://localhost:3000/api/v1
```

## Production Deployment

### Prerequisites
- Docker Swarm or Kubernetes cluster
- Domain name with SSL certificate
- Load balancer (optional)

### Environment Configuration
```bash
# Create production environment file
cp .env.example .env.prod

# Edit production variables
nano .env.prod
```

Required production environment variables:
```env
NODE_ENV=production
DOMAIN=your-domain.com
DB_PASSWORD=secure-database-password
REDIS_PASSWORD=secure-redis-password
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GRAFANA_PASSWORD=secure-grafana-password
```

### Docker Swarm Deployment
```bash
# Initialize Docker Swarm (if not already done)
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml botalto

# Check service status
docker service ls

# Scale services
docker service scale botalto_backend=5
```

### Production NGINX Configuration
Create `nginx/nginx.prod.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream servers
    upstream backend {
        server backend:3000;
        keepalive 32;
    }

    upstream frontend {
        server frontend:3000;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm (optional)

### Namespace Setup
```bash
# Create namespace
kubectl create namespace botalto

# Set namespace as default
kubectl config set-context --current --namespace=botalto
```

### Deploy with kubectl
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
kubectl get ingress
```

### Deploy with Helm
```bash
# Add Helm repository (if using charts)
helm repo add botalto https://charts.botalto.com
helm repo update

# Install BotAlto
helm install botalto botalto/botalto \
  --namespace botalto \
  --set domain=your-domain.com \
  --set postgresql.enabled=true \
  --set redis.enabled=true
```

### Kubernetes Manifests
Create `k8s/` directory with the following files:

#### ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: botalto-config
data:
  NODE_ENV: "production"
  DB_HOST: "postgres"
  DB_PORT: "5432"
  DB_DATABASE: "botalto"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
```

#### Secret
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: botalto-secrets
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: botalto-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: botalto-backend
  template:
    metadata:
      labels:
        app: botalto-backend
    spec:
      containers:
      - name: backend
        image: botalto/backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: botalto-config
        - secretRef:
            name: botalto-secrets
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name botalto

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster botalto --service-name botalto-service --task-definition botalto:1
```

#### Using AWS EKS
```bash
# Create EKS cluster
eksctl create cluster --name botalto-cluster --region us-west-2

# Deploy BotAlto
kubectl apply -f k8s/
```

### Google Cloud Deployment

#### Using Google Cloud Run
```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/botalto

# Deploy to Cloud Run
gcloud run deploy botalto --image gcr.io/PROJECT_ID/botalto --platform managed
```

#### Using Google GKE
```bash
# Create GKE cluster
gcloud container clusters create botalto-cluster --zone us-central1-a

# Deploy BotAlto
kubectl apply -f k8s/
```

### Azure Deployment

#### Using Azure Container Instances
```bash
# Create resource group
az group create --name botalto-rg --location eastus

# Deploy container group
az container create --resource-group botalto-rg --name botalto --image botalto/backend:latest
```

## SSL Configuration

### Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

### Auto-renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line
0 12 * * * /usr/bin/certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/nginx/ssl/key.pem && docker-compose restart nginx
```

## Monitoring Setup

### Prometheus Configuration
```yaml
# monitoring/prometheus.prod.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "botalto_rules.yml"

scrape_configs:
  - job_name: 'botalto-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 5s

  - job_name: 'botalto-postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'botalto-redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Grafana Dashboards
Create custom dashboards for:
- Bot performance metrics
- System resource usage
- Error rates and response times
- User activity and bot usage

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="botalto"

# Create backup
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x scripts/backup.sh

# Add to crontab for daily backups
0 2 * * * /path/to/scripts/backup.sh
```

### File Storage Backup
```bash
# Backup uploads directory
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Backup configuration files
tar -czf backups/config_$(date +%Y%m%d_%H%M%S).tar.gz .env* nginx/ monitoring/
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres

# Reset database (development only)
docker-compose down -v
docker-compose up -d postgres
npm run db:migrate
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Reset Redis (development only)
docker-compose down -v
docker-compose up -d redis
```

#### Bot Container Issues
```bash
# Check bot container logs
docker logs botalto-bot-<bot-id>

# Restart bot container
docker-compose exec backend npm run bot:restart <bot-id>

# Check bot container status
docker ps | grep botalto-bot
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Check system resources
htop
df -h
free -h

# Check application logs
docker-compose logs -f backend
```

### Log Analysis
```bash
# View real-time logs
docker-compose logs -f

# Search for errors
docker-compose logs | grep -i error

# Check specific service logs
docker-compose logs backend | tail -100
```

### Health Checks
```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Check database health
curl http://localhost:3000/api/v1/health/detailed

# Check readiness
curl http://localhost:3000/api/v1/health/ready
```

## Security Considerations

### Production Security Checklist
- [ ] Change default passwords
- [ ] Use strong JWT secrets
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption
- [ ] Network segmentation

### Security Headers
```nginx
# Add to NGINX configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

## Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_bots_owner_id ON bots(owner_id);
CREATE INDEX idx_commands_bot_id ON commands(bot_id);
CREATE INDEX idx_logs_bot_id_created_at ON bot_logs(bot_id, created_at);

-- Analyze table statistics
ANALYZE bots;
ANALYZE commands;
ANALYZE bot_logs;
```

### Redis Optimization
```bash
# Configure Redis for better performance
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### Application Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries
- Use connection pooling

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Database backups
- [ ] Log rotation
- [ ] Security updates
- [ ] Performance monitoring
- [ ] SSL certificate renewal
- [ ] System updates
- [ ] Capacity planning

### Monitoring Alerts
Set up alerts for:
- High CPU/memory usage
- Database connection issues
- Bot container failures
- SSL certificate expiration
- Disk space usage
- Error rate spikes

### Documentation
- Keep deployment documentation updated
- Document custom configurations
- Maintain runbooks for common issues
- Update security procedures

---

For additional support, please refer to the main README or contact the BotAlto team.