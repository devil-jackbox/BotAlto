#!/bin/bash

# BotAlto Universal Deployment Script
# Supports Railway, Render, Heroku, and other platforms

set -e

echo "🚀 BotAlto Universal Deployment"
echo "==============================="

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

# Show platform selection menu
show_menu() {
    echo ""
    echo "Select deployment platform:"
    echo "1) Railway (Recommended - Free tier with $5/month)"
    echo "2) Render (Free tier available)"
    echo "3) Heroku (Paid only - $7/month minimum)"
    echo "4) Vercel (Frontend only - Free)"
    echo "5) Netlify (Frontend only - Free)"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
}

# Railway deployment
deploy_railway() {
    print_status "Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    railway login
    
    # Create project if not exists
    if [ ! -f .railway/project.json ]; then
        railway init --name botalto-platform
    fi
    
    # Add PostgreSQL if not exists
    if ! railway service list | grep -q postgresql; then
        railway add postgresql
    fi
    
    # Add Redis if not exists
    if ! railway service list | grep -q redis; then
        railway add redis
    fi
    
    # Set environment variables
    railway variables set NODE_ENV=production
    railway variables set PORT=3000
    railway variables set API_PREFIX=api/v1
    railway variables set JWT_SECRET=$(openssl rand -base64 32)
    railway variables set BCRYPT_ROUNDS=12
    railway variables set LOG_LEVEL=info
    
    # Deploy
    railway up
    
    # Setup database
    railway run npm run db:migrate
    railway run npm run db:seed
    
    # Get URL
    DEPLOY_URL=$(railway status | grep "Deployment URL" | awk '{print $3}')
    print_success "Deployed to Railway: $DEPLOY_URL"
}

# Render deployment
deploy_render() {
    print_status "Deploying to Render..."
    
    print_warning "Render deployment requires manual setup:"
    echo "1. Fork this repository to your GitHub account"
    echo "2. Go to https://render.com and sign up"
    echo "3. Click 'New +' → 'Blueprint'"
    echo "4. Select your forked repository"
    echo "5. Render will automatically detect render.yaml"
    echo "6. Click 'Apply' to deploy"
    echo ""
    echo "The render.yaml file is already configured for automatic deployment."
    
    print_success "Please follow the manual steps above to deploy to Render"
}

# Heroku deployment
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI not installed. Please install it first:"
        echo "https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Login to Heroku
    heroku login
    
    # Create app if not exists
    if ! heroku apps:info &> /dev/null; then
        heroku create botalto-platform-$(date +%s)
    fi
    
    # Add PostgreSQL
    heroku addons:create heroku-postgresql:mini
    
    # Add Redis
    heroku addons:create heroku-redis:mini
    
    # Set environment variables
    heroku config:set NODE_ENV=production
    heroku config:set JWT_SECRET=$(openssl rand -base64 32)
    heroku config:set BCRYPT_ROUNDS=12
    heroku config:set LOG_LEVEL=info
    
    # Deploy
    git push heroku main
    
    # Setup database
    heroku run npm run db:migrate
    heroku run npm run db:seed
    
    # Open app
    DEPLOY_URL=$(heroku info -s | grep web_url | cut -d= -f2)
    print_success "Deployed to Heroku: $DEPLOY_URL"
}

# Vercel deployment (frontend only)
deploy_vercel() {
    print_status "Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found. Vercel deployment requires a frontend."
        exit 1
    fi
    
    # Deploy frontend
    cd frontend
    vercel --prod
    
    print_success "Frontend deployed to Vercel"
    print_warning "Note: Vercel doesn't support databases. You'll need external services for backend."
}

# Netlify deployment (frontend only)
deploy_netlify() {
    print_status "Deploying frontend to Netlify..."
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found. Netlify deployment requires a frontend."
        exit 1
    fi
    
    # Build frontend
    cd frontend
    npm install
    npm run build
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    # Deploy
    netlify deploy --prod --dir=build
    
    print_success "Frontend deployed to Netlify"
    print_warning "Note: Netlify doesn't support databases. You'll need external services for backend."
}

# Main deployment function
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                deploy_railway
                break
                ;;
            2)
                deploy_render
                break
                ;;
            3)
                deploy_heroku
                break
                ;;
            4)
                deploy_vercel
                break
                ;;
            5)
                deploy_netlify
                break
                ;;
            6)
                print_status "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-6."
                ;;
        esac
    done
    
    # Display post-deployment information
    echo ""
    echo "🎉 Deployment completed!"
    echo "========================"
    echo ""
    echo "Next steps:"
    echo "1. Access your application using the URL provided above"
    echo "2. Login with default admin credentials:"
    echo "   Email: admin@botalto.com"
    echo "   Password: admin123"
    echo "3. Change the default password immediately"
    echo "4. Configure your Telegram bots"
    echo ""
    echo "For more information, see FREE-DEPLOYMENT.md"
}

# Run main function
main "$@"