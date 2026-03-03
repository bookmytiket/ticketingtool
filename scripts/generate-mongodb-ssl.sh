#!/bin/bash

# Script to generate SSL certificates for MongoDB

echo "Generating SSL certificates for MongoDB..."

# Create ssl directory if it doesn't exist
mkdir -p ssl/mongodb

# Generate CA private key
openssl genrsa -out ssl/mongodb/ca.key 4096

# Generate CA certificate
openssl req -new -x509 -days 365 -key ssl/mongodb/ca.key -out ssl/mongodb/ca.crt -subj "/C=US/ST=State/L=City/O=MongoDB/CN=MongoDB-CA"

# Generate server private key
openssl genrsa -out ssl/mongodb/server.key 4096

# Generate server certificate signing request
openssl req -new -key ssl/mongodb/server.key -out ssl/mongodb/server.csr -subj "/C=US/ST=State/L=City/O=MongoDB/CN=mongodb"

# Create server certificate extensions file
cat > ssl/mongodb/server.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = mongodb
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Generate server certificate
openssl x509 -req -in ssl/mongodb/server.csr -CA ssl/mongodb/ca.crt -CAkey ssl/mongodb/ca.key -CAcreateserial -out ssl/mongodb/server.crt -days 365 -extfile ssl/mongodb/server.ext

# Create PEM file (MongoDB needs both cert and key in one file)
cat ssl/mongodb/server.crt ssl/mongodb/server.key > ssl/mongodb/server.pem

# Set proper permissions
chmod 600 ssl/mongodb/*.key
chmod 600 ssl/mongodb/*.pem
chmod 644 ssl/mongodb/*.crt

# Clean up
rm ssl/mongodb/server.csr ssl/mongodb/server.ext ssl/mongodb/ca.srl

echo "MongoDB SSL certificates generated successfully!"
echo "CA Certificate: ssl/mongodb/ca.crt"
echo "Server Certificate: ssl/mongodb/server.crt"
echo "Server Key: ssl/mongodb/server.key"
echo "Server PEM: ssl/mongodb/server.pem"
echo ""
echo "For MongoDB Compass, use: mongodb://localhost:27018/?tls=true&tlsCAFile=/path/to/ca.crt"

