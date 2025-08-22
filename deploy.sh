#!/bin/bash

# Production Deployment Script for Poppat Jamals DSR
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Starting Poppat Jamals DSR Production Deployment..."

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    print_success "All dependencies are available"
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    cd web
    npm install
    cd ..
    
    print_success "Dependencies installed successfully"
}

# Run tests before deployment
run_tests() {
    print_status "Running tests..."
    
    # Run backend tests
    print_status "Running backend tests..."
    cd backend
    if npm test; then
        print_success "Backend tests passed"
    else
        print_warning "Backend tests failed - continuing anyway"
    fi
    cd ..
    
    # Run frontend tests
    print_status "Running frontend tests..."
    cd web
    if npm test; then
        print_success "Frontend tests passed"
    else
        print_warning "Frontend tests failed - continuing anyway"
    fi
    cd ..
}

# Run linting
run_linting() {
    print_status "Running code linting..."
    
    # Lint backend
    cd backend
    if npm run lint; then
        print_success "Backend linting passed"
    else
        print_warning "Backend linting issues found - continuing anyway"
    fi
    cd ..
    
    # Lint frontend
    cd web
    if npm run lint; then
        print_success "Frontend linting passed"
    else
        print_warning "Frontend linting issues found - continuing anyway"
    fi
    cd ..
}

# Build the application
build_application() {
    print_status "Building application for production..."
    
    # Build frontend
    cd web
    npm run build:production
    cd ..
    
    print_success "Application built successfully"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if user is logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        print_status "Please log in to Vercel..."
        vercel login
    fi
    
    # Deploy to production
    vercel --prod
    
    print_success "Deployment completed successfully!"
}

# Display post-deployment information
post_deployment_info() {
    print_success "🎉 Deployment Complete!"
    echo ""
    echo "Your application has been deployed to Vercel."
    echo ""
    echo "Next steps:"
    echo "1. Check the Vercel dashboard for your deployment URL"
    echo "2. Configure your custom domain (if applicable)"
    echo "3. Test all application features"
    echo "4. Update Google OAuth redirect URIs with the new domain"
    echo ""
    echo "Important notes:"
    echo "- Verify all environment variables are set in Vercel dashboard"
    echo "- Ensure database connections are working"
    echo "- Test Google SSO functionality"
    echo ""
    echo "For troubleshooting, see PRODUCTION_DEPLOYMENT.md"
}

# Main deployment process
main() {
    echo "================================================================="
    echo "🏢 Poppat Jamals DSR - Production Deployment"
    echo "================================================================="
    echo ""
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_LINT=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-lint)
                SKIP_LINT=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests    Skip running tests before deployment"
                echo "  --skip-lint     Skip running linting before deployment"
                echo "  --help          Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_dependencies
    install_dependencies
    
    if [ "$SKIP_LINT" = false ]; then
        run_linting
    else
        print_warning "Skipping linting as requested"
    fi
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests as requested"
    fi
    
    build_application
    deploy_to_vercel
    post_deployment_info
    
    echo ""
    print_success "✅ Deployment process completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted!"; exit 1' INT TERM

# Run main function
main "$@"