#!/bin/bash

# BotAlto Railway Deployment Script
# This script helps deploy BotAlto to Railway

set -e

echo "🚀 BotAlto Railway Deployment"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Railway CLI is installed
check_railway_cli() {
    print_status "Checking Railway CLI installation..."
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    print_success "Railway CLI is installed"
}

# Login to Railway
login_railway() {
    print_status "Logging into Railway..."
    railway login
    print_success "Logged into Railway"
}

# Create Railway project
create_project() {
    print_status "Creating Railway project..."
    railway init --name botalto-platform
    print_success "Railway project created"
}

# Add PostgreSQL service
add_postgres() {
    print_status "Adding PostgreSQL service..."
    railway add postgresql
    print_success "PostgreSQL service added"
}

# Add Redis service
add_redis() {
    print_status "Adding Redis service..."
    railway add redis
    print_success "Redis service added"
}

# Set environment variables
set_environment() {
    print_status "Setting environment variables..."
    
    # Get service URLs
    POSTGRES_URL=$(railway variables --service postgresql | grep DATABASE_URL | cut -d'=' -f2)
    REDIS_URL=$(railway variables --service redis | grep REDIS_URL | cut -d'=' -f2)
    
    # Set main service variables
    railway variables set NODE_ENV=production
    railway variables set PORT=3000
    railway variables set API_PREFIX=api/v1
    railway variables set JWT_SECRET=$(openssl rand -base64 32)
    railway variables set BCRYPT_ROUNDS=12
    railway variables set LOG_LEVEL=info
    
    # Set database variables
    railway variables set DB_HOST=$(echo $POSTGRES_URL | sed 's/.*@\([^:]*\).*/\1/')
    railway variables set DB_PORT=5432
    railway variables set DB_USERNAME=$(echo $POSTGRES_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')
    railway variables set DB_PASSWORD=$(echo $POSTGRES_URL | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
    railway variables set DB_DATABASE=$(echo $POSTGRES_URL | sed 's/.*\/\([^?]*\).*/\1/')
    
    # Set Redis variables
    railway variables set REDIS_HOST=$(echo $REDIS_URL | sed 's/.*@\([^:]*\).*/\1/')
    railway variables set REDIS_PORT=6379
    railway variables set REDIS_PASSWORD=$(echo $REDIS_URL | sed 's/.*:\/\/:\([^@]*\)@.*/\1/')
    
    print_success "Environment variables set"
}

# Deploy the application
deploy_app() {
    print_status "Deploying application..."
    railway up
    print_success "Application deployed"
}

# Get deployment URL
get_url() {
    print_status "Getting deployment URL..."
    DEPLOY_URL=$(railway status | grep "Deployment URL" | awk '{print $3}')
    print_success "Deployment URL: $DEPLOY_URL"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    railway run npm run db:migrate
    print_success "Database setup complete"
}

# Create admin user
create_admin() {
    print_status "Creating admin user..."
    railway run npm run db:seed
    print_success "Admin user created"
}

# Display final information
display_info() {
    echo ""
    echo "🎉 BotAlto Railway Deployment Complete!"
    echo "======================================="
    echo ""
    echo "Your BotAlto platform is now live!"
    echo ""
    echo "Access URLs:"
    echo "  Main Application: $DEPLOY_URL"
    echo "  API Endpoint: $DEPLOY_URL/api/v1"
    echo "  Health Check: $DEPLOY_URL/api/v1/health"
    echo ""
    echo "Default Admin Credentials:"
    echo "  Email:    admin@botalto.com"
    echo "  Password: admin123"
    echo ""
    echo "Railway Dashboard:"
    echo "  https://railway.app/dashboard"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:     railway logs"
    echo "  Open app:      railway open"
    echo "  Deploy:        railway up"
    echo "  Variables:     railway variables"
    echo ""
}

# Main execution
main() {
    check_railway_cli
    login_railway
    create_project
    add_postgres
    add_redis
    set_environment
    deploy_app
    get_url
    setup_database
    create_admin
    display_info
}

# Run main function
main "$@"