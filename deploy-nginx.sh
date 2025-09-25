#!/bin/bash

# Deployment script for Mapsy Widget with Nginx CORS setup
# Run this on your server

echo "🚀 Setting up Mapsy Widget with CORS support..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NGINX_SITE="mapsy-widget.nextechspires.com"
NGINX_CONFIG="/etc/nginx/sites-available/${NGINX_SITE}"
WIDGET_ROOT="/var/www/${NGINX_SITE}"

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${GREEN}✓ Running as root${NC}"
    else
        echo -e "${YELLOW}⚠ Not running as root, will use sudo${NC}"
        SUDO="sudo"
    fi
}

# Backup existing config
backup_config() {
    if [ -f "$NGINX_CONFIG" ]; then
        echo -e "${YELLOW}📁 Backing up existing nginx config...${NC}"
        $SUDO cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d-%H%M%S)"
        echo -e "${GREEN}✓ Backup created${NC}"
    fi
}

# Update nginx configuration
update_nginx_config() {
    echo -e "${YELLOW}📝 Updating Nginx configuration...${NC}"

    # Check if server block exists
    if [ ! -f "$NGINX_CONFIG" ]; then
        echo -e "${RED}✗ Nginx config not found at $NGINX_CONFIG${NC}"
        echo -e "${YELLOW}Creating new configuration...${NC}"

        # Create new configuration
        cat > /tmp/nginx-widget.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mapsy-widget.nextechspires.com;

    root /var/www/mapsy-widget.nextechspires.com/dist;
    index integration.html index.html;

    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;

    # Handle preflight OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
        add_header Access-Control-Max-Age 86400;
        add_header Content-Length 0;
        add_header Content-Type "text/plain";
        return 204;
    }

    # Specific handling for manifest.json
    location = /manifest.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Access-Control-Allow-Origin "*" always;
        try_files $uri =404;
    }

    # Cache control for loader
    location = /mapsy-widget-loader.js {
        add_header Cache-Control "public, max-age=300" always;
        add_header Access-Control-Allow-Origin "*" always;
        try_files $uri =404;
    }

    # Cache control for JS/CSS files
    location ~* \.(js|css)$ {
        add_header Cache-Control "public, max-age=31536000" always;
        add_header Access-Control-Allow-Origin "*" always;
        try_files $uri =404;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    location / {
        try_files $uri $uri/ =404;
    }

    # Logging
    access_log /var/log/nginx/${NGINX_SITE}.access.log;
    error_log /var/log/nginx/${NGINX_SITE}.error.log;
}
EOF

        $SUDO mv /tmp/nginx-widget.conf "$NGINX_CONFIG"
        echo -e "${GREEN}✓ New configuration created${NC}"
    else
        echo -e "${YELLOW}⚠ Config exists. Please manually add CORS headers from nginx-cors-fix.conf${NC}"
        echo ""
        echo "Add these lines inside your server { } block:"
        echo ""
        cat nginx-cors-fix.conf
        echo ""
        read -p "Have you added the CORS configuration? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}✗ Please add the CORS configuration manually${NC}"
            exit 1
        fi
    fi
}

# Test nginx configuration
test_nginx() {
    echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
    $SUDO nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
        return 0
    else
        echo -e "${RED}✗ Nginx configuration has errors${NC}"
        return 1
    fi
}

# Reload nginx
reload_nginx() {
    echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
    $SUDO systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
    else
        echo -e "${RED}✗ Failed to reload nginx${NC}"
        exit 1
    fi
}

# Test CORS headers
test_cors() {
    echo -e "${YELLOW}🌐 Testing CORS headers...${NC}"

    # Wait a moment for nginx to fully reload
    sleep 2

    # Test manifest.json
    echo "Testing manifest.json..."
    CORS_HEADER=$(curl -sI "https://${NGINX_SITE}/manifest.json" | grep -i "access-control-allow-origin")

    if [[ $CORS_HEADER == *"*"* ]]; then
        echo -e "${GREEN}✓ CORS headers are working!${NC}"
        echo "  $CORS_HEADER"
    else
        echo -e "${RED}✗ CORS headers not found${NC}"
        echo "Checking HTTP (non-SSL)..."
        CORS_HEADER=$(curl -sI "http://${NGINX_SITE}/manifest.json" | grep -i "access-control-allow-origin")
        if [[ $CORS_HEADER == *"*"* ]]; then
            echo -e "${GREEN}✓ CORS headers working on HTTP${NC}"
            echo -e "${YELLOW}⚠ Consider setting up SSL${NC}"
        else
            echo -e "${RED}✗ CORS headers still not working${NC}"
        fi
    fi
}

# Upload widget files
upload_files() {
    echo -e "${YELLOW}📤 Uploading widget files...${NC}"

    if [ -d "dist" ]; then
        echo "Copying files to $WIDGET_ROOT/dist..."
        $SUDO mkdir -p "$WIDGET_ROOT/dist"
        $SUDO cp -r dist/* "$WIDGET_ROOT/dist/"
        $SUDO chown -R www-data:www-data "$WIDGET_ROOT"
        echo -e "${GREEN}✓ Files uploaded${NC}"
    else
        echo -e "${YELLOW}⚠ No dist folder found. Please build the widget first with: npm run build${NC}"
    fi
}

# Main execution
main() {
    echo ""
    echo "========================================="
    echo "  Mapsy Widget Nginx CORS Setup"
    echo "========================================="
    echo ""

    check_root
    backup_config
    update_nginx_config

    if test_nginx; then
        reload_nginx
        upload_files
        test_cors

        echo ""
        echo -e "${GREEN}✨ Setup complete!${NC}"
        echo ""
        echo "📝 Next steps:"
        echo "1. Test your widget at: https://${NGINX_SITE}/integration.html"
        echo "2. Include in any website with:"
        echo "   <script src=\"https://${NGINX_SITE}/mapsy-widget-loader.js\"></script>"
        echo "   <mapsy-widget></mapsy-widget>"
        echo ""
    else
        echo -e "${RED}✗ Setup failed. Please fix nginx errors and try again.${NC}"
        exit 1
    fi
}

# Run main function
main