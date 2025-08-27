#!/bin/bash

# BotAlto Platform Setup Script
# This script sets up the development environment for BotAlto

set -e

echo "🚀 BotAlto Platform Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION is installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p uploads
    mkdir -p logs
    mkdir -p logs/nginx
    mkdir -p database/init
    mkdir -p nginx/ssl
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    print_success "Directories created"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Environment file created from template"
    else
        print_warning "Environment file already exists, skipping..."
    fi
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    if [ -f package.json ]; then
        npm install
        print_success "Backend dependencies installed"
    else
        print_error "package.json not found in current directory"
        exit 1
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Create database initialization script
    cat > database/init/01-init.sql << 'EOF'
-- BotAlto Database Initialization
CREATE DATABASE IF NOT EXISTS botalto;
\c botalto;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin user (password: admin123)
INSERT INTO users (id, email, "firstName", "lastName", password, role, status, "isEmailVerified", "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4(),
    'admin@botalto.com',
    'Admin',
    'User',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O',
    'owner',
    'active',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
EOF

    print_success "Database initialization script created"
}

# Setup NGINX configuration
setup_nginx() {
    print_status "Setting up NGINX configuration..."
    
    # Create frontend NGINX config
    cat > nginx/frontend.conf << 'EOF'
server {
    listen 3000;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

    print_success "NGINX configuration created"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring configuration..."
    
    # Create Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

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
EOF

    # Create Grafana datasource
    mkdir -p monitoring/grafana/datasources
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    print_success "Monitoring configuration created"
}

# Generate SSL certificates for development
generate_ssl_certs() {
    print_status "Generating SSL certificates for development..."
    
    if [ ! -f nginx/ssl/cert.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist, skipping..."
    fi
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    print_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec -T postgres pg_isready -U postgres; do
        sleep 2
    done
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose exec -T redis redis-cli ping; do
        sleep 2
    done
    
    # Wait for Backend
    print_status "Waiting for Backend..."
    until curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; do
        sleep 5
    done
    
    print_success "All services are ready"
}

# Display final information
display_info() {
    echo ""
    echo "🎉 BotAlto Platform Setup Complete!"
    echo "==================================="
    echo ""
    echo "Access URLs:"
    echo "  Frontend:     http://localhost:3001"
    echo "  Backend API:  http://localhost:3000/api/v1"
    echo "  Health Check: http://localhost:3000/api/v1/health"
    echo "  Grafana:      http://localhost:3002 (admin/admin123)"
    echo ""
    echo "Default Admin Credentials:"
    echo "  Email:    admin@botalto.com"
    echo "  Password: admin123"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart:       docker-compose restart"
    echo ""
    echo "For development:"
    echo "  Backend:       npm run start:dev"
    echo "  Frontend:      cd frontend && npm start"
    echo ""
}

# Main execution
main() {
    check_docker
    check_nodejs
    create_directories
    setup_environment
    install_backend_deps
    setup_database
    setup_nginx
    setup_monitoring
    generate_ssl_certs
    start_services
    wait_for_services
    display_info
}

# Run main function
main "$@"