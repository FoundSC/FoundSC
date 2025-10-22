#!/bin/bash

# run_db.sh - Supabase database management script
# Usage:
#   ./run_db.sh              - Start Supabase
#   ./run_db.sh --shell|-s   - Start Supabase and open psql shell
#   ./run_db.sh --reset|-r   - Reset database (apply migrations and seeds)
#   ./run_db.sh --stop       - Stop Supabase
#   ./run_db.sh --status     - Show Supabase status
#   ./run_db.sh --query|-q   - Run a quick query
#   ./run_db.sh --help|-h    - Show this help message

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function to print colored messages
print_info() {
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

# Function to start Supabase
start_supabase() {
    print_info "Starting Supabase..."
    supabase start
    print_success "Supabase started successfully!"
    echo ""
    print_info "Access points:"
    echo "  - Studio:   http://127.0.0.1:3001"
    echo "  - API:      http://127.0.0.1:8000"
    echo "  - Database: postgresql://postgres:postgres@127.0.0.1:5432/postgres"
}

# Function to open psql shell
open_shell() {
    print_info "Opening PostgreSQL shell..."
    echo -e "${YELLOW}Tip: Type \\q to exit the shell${NC}"
    echo -e "${YELLOW}Tip: Run \\pset pager off inside psql for better viewing${NC}"
    docker exec -it supabase_db_FoundSC psql -U postgres
}

# Function to reset database
reset_db() {
    print_warning "Resetting database (this will drop all data)..."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase db reset
        print_success "Database reset complete!"
    else
        print_info "Reset cancelled."
    fi
}

# Function to stop Supabase
stop_supabase() {
    print_info "Stopping Supabase..."
    supabase stop
    print_success "Supabase stopped."
}

# Function to show status
show_status() {
    print_info "Supabase status:"
    supabase status
}

# Function to run quick query
run_query() {
    print_info "Available quick queries:"
    echo "  1. View all posts"
    echo "  2. Count posts by type"
    echo "  3. Count posts by category"
    echo "  4. View posts with images"
    echo "  5. Recent posts (last 5)"
    echo "  6. Custom query"
    echo ""
    read -p "Select query (1-6): " choice

    case $choice in
        1)
            print_info "All posts:"
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT id, title, type, category, location FROM posts ORDER BY created_at DESC;"
            ;;
        2)
            print_info "Posts by type:"
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT type, COUNT(*) as count FROM posts GROUP BY type;"
            ;;
        3)
            print_info "Posts by category:"
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT category, COUNT(*) as count FROM posts GROUP BY category ORDER BY count DESC;"
            ;;
        4)
            print_info "Posts with images:"
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT id, title, image_url FROM posts WHERE image_url IS NOT NULL;"
            ;;
        5)
            print_info "Recent posts:"
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT id, title, type, created_at FROM posts ORDER BY created_at DESC LIMIT 5;"
            ;;
        6)
            read -p "Enter your SQL query: " custom_query
            docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "$custom_query"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Supabase Database Management Script"
    echo ""
    echo "Usage:"
    echo "  ./run_db.sh              - Start Supabase"
    echo "  ./run_db.sh --shell|-s   - Start Supabase and open psql shell"
    echo "  ./run_db.sh --reset|-r   - Reset database (apply migrations and seeds)"
    echo "  ./run_db.sh --stop       - Stop Supabase"
    echo "  ./run_db.sh --status     - Show Supabase status"
    echo "  ./run_db.sh --query|-q   - Run a quick query"
    echo "  ./run_db.sh --help|-h    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run_db.sh -s           # Start and open shell"
    echo "  ./run_db.sh -q           # Run a quick query"
    echo "  ./run_db.sh --reset      # Reset database"
}

# Main script logic
case "${1:-}" in
    --shell|-s)
        start_supabase
        echo ""
        open_shell
        ;;
    --reset|-r)
        reset_db
        ;;
    --stop)
        stop_supabase
        ;;
    --status)
        show_status
        ;;
    --query|-q)
        run_query
        ;;
    --help|-h)
        show_help
        ;;
    "")
        # No arguments - just start
        start_supabase
        ;;
    *)
        print_error "Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
