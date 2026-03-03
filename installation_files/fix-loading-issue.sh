#!/bin/bash

###############################################################################
# Fix Application Not Loading Issue
# This script diagnoses and fixes common issues preventing the app from loading
###############################################################################

PROJECT_DIR="/home/raja/Desktop/new_project/ticketing_tool"
DIST_DIR="$PROJECT_DIR/dist"

echo "=========================================="
echo "  Diagnosing Application Loading Issue"
echo "=========================================="
echo ""

# Check backend
echo "1. Checking backend..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "   ✓ Backend is running on port 5000"
else
    echo "   ✗ Backend is NOT running"
    echo "   Fix: pm2 start ecosystem.config.cjs"
    exit 1
fi

# Check PM2
echo ""
echo "2. Checking PM2 services..."
if pm2 list | grep -q "ticketing-backend.*online"; then
    echo "   ✓ Backend service is online"
else
    echo "   ✗ Backend service is not online"
    echo "   Fix: pm2 restart ticketing-backend"
fi

# Check nginx
echo ""
echo "3. Checking nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   ✓ Nginx is running"
else
    echo "   ✗ Nginx is NOT running"
    echo "   Fix: sudo systemctl start nginx"
fi

# Check dist folder
echo ""
echo "4. Checking frontend files..."
if [ -d "$DIST_DIR" ]; then
    echo "   ✓ dist folder exists"
    if [ -f "$DIST_DIR/index.html" ]; then
        echo "   ✓ index.html exists"
    else
        echo "   ✗ index.html missing"
        echo "   Fix: npm run build"
    fi
else
    echo "   ✗ dist folder missing"
    echo "   Fix: npm run build"
    exit 1
fi

# Fix permissions
echo ""
echo "5. Fixing permissions..."
sudo chown -R www-data:www-data "$DIST_DIR" 2>/dev/null
sudo chmod -R 755 "$DIST_DIR" 2>/dev/null
sudo find "$DIST_DIR" -type f -exec chmod 644 {} \; 2>/dev/null
echo "   ✓ Permissions fixed"

# Check nginx config
echo ""
echo "6. Checking nginx configuration..."
if [ -f "/etc/nginx/sites-enabled/ticketing-tool" ]; then
    echo "   ✓ Nginx config exists"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✓ Nginx configuration is valid"
    else
        echo "   ✗ Nginx configuration has errors"
        echo "   Checking errors..."
        sudo nginx -t 2>&1 | grep -i error
    fi
else
    echo "   ✗ Nginx config not found"
    echo "   Fix: sudo ./setup-nginx.sh (if available) or configure manually"
fi

# Test nginx access
echo ""
echo "7. Testing nginx access..."
if curl -s http://localhost/ | grep -q "html\|Ticketing"; then
    echo "   ✓ Frontend is accessible via nginx"
else
    echo "   ✗ Frontend not accessible (500 error likely)"
    echo "   Checking nginx error log..."
    echo "   Run: sudo tail -20 /var/log/nginx/error.log"
fi

# Reload nginx
echo ""
echo "8. Reloading nginx..."
if sudo systemctl reload nginx 2>/dev/null; then
    echo "   ✓ Nginx reloaded"
else
    echo "   ⚠ Could not reload nginx (may need to start it)"
    sudo systemctl start nginx 2>/dev/null
fi

echo ""
echo "=========================================="
echo "  Diagnostic Complete"
echo "=========================================="
echo ""
echo "Try accessing: http://localhost"
echo ""
echo "If still not working, check:"
echo "  1. sudo tail -f /var/log/nginx/error.log"
echo "  2. pm2 logs ticketing-backend"
echo "  3. Verify dist folder: ls -la $DIST_DIR"

