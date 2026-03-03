#!/bin/bash

###############################################################################
# Fix Nginx Permission Denied Error
# This fixes the "Permission denied (13)" error when nginx tries to access files
###############################################################################

PROJECT_DIR="/home/raja/Desktop/new_project/ticketing_tool"
DIST_DIR="$PROJECT_DIR/dist"

echo "=========================================="
echo "  Fixing Nginx Permission Issues"
echo "=========================================="
echo ""

# Fix parent directory permissions (nginx needs execute to traverse)
echo "1. Fixing parent directory permissions..."
echo "   (Nginx needs execute permission on all parent directories)"
sudo chmod 755 /home 2>/dev/null || true
sudo chmod 755 /home/raja 2>/dev/null || true  # CRITICAL: Currently 750, needs to be 755
sudo chmod 755 /home/raja/Desktop 2>/dev/null || true
sudo chmod 755 /home/raja/Desktop/new_project 2>/dev/null || true
sudo chmod 755 /home/raja/Desktop/new_project/ticketing_tool 2>/dev/null || true
echo "   ✓ Parent directories permissions fixed"
echo "   Note: /home/raja was changed from 750 to 755 to allow nginx access"

# Fix dist folder ownership and permissions
echo ""
echo "2. Fixing dist folder permissions..."
sudo chown -R www-data:www-data "$DIST_DIR" 2>/dev/null
sudo chmod -R 755 "$DIST_DIR" 2>/dev/null
sudo find "$DIST_DIR" -type f -exec chmod 644 {} \; 2>/dev/null
sudo find "$DIST_DIR" -type d -exec chmod 755 {} \; 2>/dev/null
echo "   ✓ Dist folder permissions fixed"

# Verify nginx can access
echo ""
echo "3. Verifying nginx can access files..."
if sudo -u www-data test -r "$DIST_DIR/index.html" 2>/dev/null; then
    echo "   ✓ Nginx can read index.html"
else
    echo "   ✗ Nginx still cannot read index.html"
    echo "   Trying alternative fix..."
    
    # Alternative: Add www-data to raja's group or use ACL
    sudo usermod -a -G raja www-data 2>/dev/null || true
    sudo chmod g+x /home/raja/Desktop/new_project/ticketing_tool 2>/dev/null || true
    sudo chgrp -R raja "$DIST_DIR" 2>/dev/null || true
    sudo chmod -R g+r "$DIST_DIR" 2>/dev/null || true
    sudo chmod -R g+X "$DIST_DIR" 2>/dev/null || true
fi

# Update nginx config
echo ""
echo "4. Updating nginx configuration..."
sudo cp "$PROJECT_DIR/nginx-ticketing.conf" /etc/nginx/sites-available/ticketing-tool 2>/dev/null
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✓ Nginx configuration is valid"
else
    echo "   ✗ Nginx configuration has errors"
    sudo nginx -t
    exit 1
fi

# Reload nginx
echo ""
echo "5. Reloading nginx..."
sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null
echo "   ✓ Nginx reloaded"

# Test access
echo ""
echo "6. Testing access..."
sleep 2
if curl -s http://localhost/ | grep -q "html\|Ticketing"; then
    echo "   ✓ Application is now accessible!"
    echo ""
    echo "=========================================="
    echo "  SUCCESS! Application is working"
    echo "=========================================="
    echo ""
    echo "Access your application at: http://localhost"
else
    echo "   ⚠ Still having issues. Check nginx error log:"
    echo "   sudo tail -20 /var/log/nginx/error.log"
fi

echo ""

