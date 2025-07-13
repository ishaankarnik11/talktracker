#!/bin/bash

# Talk Tracker Docker Startup Script

set -e

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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if docker-compose is available
check_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
}

# Main function
main() {
    echo "🚀 Talk Tracker Docker Startup"
    echo "================================"
    
    print_status "Checking Docker environment..."
    check_docker
    check_compose
    
    # Parse command line arguments
    MODE="development"
    DETACHED=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--production)
                MODE="production"
                shift
                ;;
            -d|--detach)
                DETACHED="-d"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -p, --production    Start in production mode with Nginx"
                echo "  -d, --detach        Run containers in detached mode"
                echo "  -h, --help          Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                  Start in development mode"
                echo "  $0 -p -d           Start in production mode, detached"
                echo "  $0 --production    Start in production mode with logs"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Check for .env file
    if [[ ! -f .env ]]; then
        print_warning "No .env file found. Using default configuration."
        print_warning "For production, create a .env file with your settings."
        echo ""
    fi
    
    # Start containers based on mode
    if [[ $MODE == "production" ]]; then
        print_status "Starting Talk Tracker in PRODUCTION mode with Nginx..."
        docker-compose --profile production up $DETACHED
        
        if [[ -n $DETACHED ]]; then
            print_success "Talk Tracker started in production mode!"
            echo ""
            echo "🌐 Application URLs:"
            echo "   Main app: http://localhost"
            echo "   Direct:   http://localhost:3000"
            echo ""
            echo "📋 Management commands:"
            echo "   View logs:    docker-compose logs -f"
            echo "   Stop:         docker-compose down"
            echo "   Status:       docker-compose ps"
        fi
    else
        print_status "Starting Talk Tracker in DEVELOPMENT mode..."
        docker-compose up $DETACHED
        
        if [[ -n $DETACHED ]]; then
            print_success "Talk Tracker started in development mode!"
            echo ""
            echo "🌐 Application URL: http://localhost:3000"
            echo ""
            echo "📋 Management commands:"
            echo "   View logs:    docker-compose logs -f"
            echo "   Stop:         docker-compose down"
            echo "   Status:       docker-compose ps"
        fi
    fi
}

# Run main function
main "$@"