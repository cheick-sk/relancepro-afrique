#!/bin/bash

# RelancePro Africa - Health Check Script
# This script performs health checks for Docker containers and Kubernetes

set -e

# Configuration
HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
TIMEOUT="${TIMEOUT:-10}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_INTERVAL="${RETRY_INTERVAL:-5}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check function
check_health() {
    local url="http://${HOST}:${PORT}/api/health"
    local response_code
    
    # Make HTTP request
    response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "${TIMEOUT}" \
        --connect-timeout "${TIMEOUT}" \
        "${url}" 2>/dev/null || echo "000")
    
    if [ "${response_code}" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Detailed health check with response body
check_health_detailed() {
    local url="http://${HOST}:${PORT}/api/health"
    local response
    
    response=$(curl -s --max-time "${TIMEOUT}" "${url}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Parse JSON response
        local status=$(echo "${response}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "${status}" = "healthy" ] || [ "${status}" = "ok" ]; then
            log_info "Application is healthy"
            echo "${response}"
            return 0
        else
            log_error "Application is unhealthy: ${status}"
            echo "${response}"
            return 1
        fi
    else
        log_error "Failed to connect to application"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    # Check if DATABASE_URL is set
    if [ -z "${DATABASE_URL}" ]; then
        log_warn "DATABASE_URL not set, skipping database check"
        return 0
    fi
    
    # Try to run a simple Prisma command
    if command -v npx &> /dev/null; then
        npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            log_info "Database connection: OK"
            return 0
        else
            log_error "Database connection: FAILED"
            return 1
        fi
    else
        log_warn "npx not available, skipping database check"
        return 0
    fi
}

# Check Redis connectivity
check_redis() {
    log_info "Checking Redis connectivity..."
    
    # Check if REDIS_URL is set
    if [ -z "${REDIS_URL}" ]; then
        log_warn "REDIS_URL not set, skipping Redis check"
        return 0
    fi
    
    # Try to ping Redis
    if command -v redis-cli &> /dev/null; then
        local redis_host=$(echo "${REDIS_URL}" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        local redis_port=$(echo "${REDIS_URL}" | sed -n 's/.*:\/\/[^:]*:\([0-9]*\).*/\1/p')
        
        redis-cli -h "${redis_host:-localhost}" -p "${redis_port:-6379}" ping > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            log_info "Redis connection: OK"
            return 0
        else
            log_error "Redis connection: FAILED"
            return 1
        fi
    else
        log_warn "redis-cli not available, skipping Redis check"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log_info "Checking disk space..."
    
    local usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    local threshold=90
    
    if [ "${usage}" -gt "${threshold}" ]; then
        log_error "Disk usage (${usage}%) exceeds threshold (${threshold}%)"
        return 1
    else
        log_info "Disk usage: ${usage}%"
        return 0
    fi
}

# Check memory usage
check_memory() {
    log_info "Checking memory usage..."
    
    if command -v free &> /dev/null; then
        local total=$(free -m | grep Mem | awk '{print $2}')
        local used=$(free -m | grep Mem | awk '{print $3}')
        local usage=$((used * 100 / total))
        local threshold=90
        
        if [ "${usage}" -gt "${threshold}" ]; then
            log_warn "Memory usage (${usage}%) is high"
        else
            log_info "Memory usage: ${usage}%"
        fi
    else
        log_info "Memory check not available on this system"
    fi
    
    return 0
}

# Main health check
main() {
    local mode="${1:-simple}"
    local retry_count=0
    local exit_code=0
    
    log_info "Starting health check..."
    log_info "Target: http://${HOST}:${PORT}"
    log_info "Mode: ${mode}"
    
    case "${mode}" in
        simple)
            # Simple health check with retries
            while [ ${retry_count} -lt ${MAX_RETRIES} ]; do
                if check_health; then
                    log_info "Health check passed"
                    exit 0
                fi
                
                retry_count=$((retry_count + 1))
                
                if [ ${retry_count} -lt ${MAX_RETRIES} ]; then
                    log_warn "Health check failed, retrying in ${RETRY_INTERVAL}s... (${retry_count}/${MAX_RETRIES})"
                    sleep ${RETRY_INTERVAL}
                fi
            done
            
            log_error "Health check failed after ${MAX_RETRIES} attempts"
            exit 1
            ;;
        
        detailed)
            check_health_detailed
            exit_code=$?
            ;;
        
        full)
            # Full health check suite
            log_info "Running full health check..."
            echo ""
            
            # Application health
            if check_health; then
                log_info "Application health: OK"
            else
                log_error "Application health: FAILED"
                exit_code=1
            fi
            
            # Database
            if check_database; then
                true
            else
                exit_code=1
            fi
            
            # Redis
            if check_redis; then
                true
            else
                exit_code=1
            fi
            
            # Disk space
            if check_disk_space; then
                true
            else
                exit_code=1
            fi
            
            # Memory
            check_memory
            
            echo ""
            if [ ${exit_code} -eq 0 ]; then
                log_info "All health checks passed!"
            else
                log_error "Some health checks failed"
            fi
            ;;
        
        *)
            log_error "Unknown mode: ${mode}"
            echo "Usage: $0 [simple|detailed|full]"
            exit 1
            ;;
    esac
    
    exit ${exit_code}
}

# Run main function with all arguments
main "$@"
