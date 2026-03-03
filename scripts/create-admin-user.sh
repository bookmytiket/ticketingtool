#!/bin/bash

# Script to create admin user in MongoDB
# This can be run from the host or inside the backend container

echo "Creating admin user in MongoDB..."

# Check if running inside Docker or on host
if [ -f "/etc/ssl/mongodb/ca.crt" ]; then
    # Running inside Docker
    MONGODB_URI="mongodb://mongodb:27017/ticketing_tool"
    NODE_CMD="node"
else
    # Running on host
    MONGODB_URI="mongodb://localhost:27018/ticketing_tool"
    NODE_CMD="node"
    
    # Check if node is available
    if ! command -v node &> /dev/null; then
        echo "Node.js not found. Running via Docker..."
        docker compose exec backend node /app/scripts/create-admin-user.js
        exit $?
    fi
fi

# Run the script
cd "$(dirname "$0")/.."
$NODE_CMD scripts/create-admin-user.js

