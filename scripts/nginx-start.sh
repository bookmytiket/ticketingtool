#!/bin/sh

# Nginx startup script that switches between HTTP and HTTPS configs

if [ "$HTTPS_ENABLED" = "true" ]; then
    echo "HTTPS enabled - using SSL configuration"
    cp /etc/nginx/conf.d/ssl.conf /etc/nginx/conf.d/default.conf
else
    echo "HTTPS disabled - using HTTP configuration"
    cp /etc/nginx/conf.d/http.conf /etc/nginx/conf.d/default.conf
fi

# Start nginx
exec nginx -g 'daemon off;'

