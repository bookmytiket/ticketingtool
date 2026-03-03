# Deployment Guide - HTTP/HTTPS with MongoDB TLS

## Configuration Summary

### HTTP/HTTPS Setup
- **HTTP**: Available on port `80`
- **HTTPS**: Available on port `443`
- **SSL Certificates**: Self-signed certificates generated in `ssl/` directory
- **Nginx**: Configured to serve both HTTP and HTTPS (no redirect)

### MongoDB Setup
- **Authentication**: Enabled with username/password
- **Username**: `mongoadmin`
- **Password**: `mongopassword`
- **TLS**: Enabled (requireTLS mode)
- **Port**: `27018` (external), `27017` (internal Docker network)

## Quick Start

### 1. Stop Existing Containers (if running)
```bash
docker compose down
```

### 2. Remove Old MongoDB Volumes (if needed for fresh start)
```bash
docker compose down -v
```

### 3. Start All Services
```bash
docker compose up -d --build
```

### 4. Check Service Status
```bash
docker compose ps
```

### 5. View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f mongodb
docker compose logs -f backend
docker compose logs -f nginx
```

## Access the Application

- **HTTP**: http://localhost
- **HTTPS**: https://localhost (self-signed certificate warning is normal)

## MongoDB Connection

### From MongoDB Compass
```
mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin&tls=true&tlsCAFile=/home/raja/Desktop/ticketing_tool/ssl/mongodb/ca.crt
```

See `MONGODB_CONNECTION_INFO.md` for detailed connection instructions.

## Environment Variables

### Backend (.env or docker-compose.yml)
- `MONGODB_URI`: Connection string with credentials
- `MONGODB_CA_FILE`: Path to CA certificate
- `JWT_SECRET`: Secret for JWT tokens
- `FRONTEND_URL`: Frontend URL (https://localhost)

## SSL Certificates

### Nginx (HTTPS)
- Certificate: `ssl/cert.pem`
- Private Key: `ssl/key.pem`

### MongoDB (TLS)
- CA Certificate: `ssl/mongodb/ca.crt`
- Server Certificate: `ssl/mongodb/server.crt`
- Server Key: `ssl/mongodb/server.key`
- Server PEM: `ssl/mongodb/server.pem`

## Troubleshooting

### MongoDB Connection Issues
1. Check if MongoDB is running: `docker compose ps mongodb`
2. Check MongoDB logs: `docker compose logs mongodb`
3. Verify certificates exist: `ls -la ssl/mongodb/`
4. Test connection: `docker compose exec mongodb mongosh --username mongoadmin --password mongopassword --authenticationDatabase admin --tls --tlsCAFile /etc/ssl/mongodb/ca.crt`

### Nginx Issues
1. Check if nginx is running: `docker compose ps nginx`
2. Check nginx logs: `docker compose logs nginx`
3. Verify SSL certificates: `ls -la ssl/`
4. Test HTTP: `curl http://localhost/health`
5. Test HTTPS: `curl -k https://localhost/health`

### Backend Issues
1. Check backend logs: `docker compose logs backend`
2. Verify MongoDB connection in logs
3. Check environment variables: `docker compose exec backend env | grep MONGODB`

## Security Notes

⚠️ **For Production:**
- Replace self-signed SSL certificates with certificates from a trusted CA (Let's Encrypt, etc.)
- Change MongoDB credentials to strong passwords
- Change JWT_SECRET to a strong random string
- Use environment variables or secrets management for sensitive data
- Enable firewall rules
- Review and restrict CORS settings

## Regenerating Certificates

### Nginx SSL Certificates
```bash
bash scripts/generate-ssl.sh
docker compose restart nginx
```

### MongoDB TLS Certificates
```bash
bash scripts/generate-mongodb-ssl.sh
docker compose down
docker compose up -d
```

## Changing MongoDB Credentials

1. Update `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` in `docker-compose.yml`
2. Update `MONGODB_URI` in backend environment variables
3. Remove MongoDB volumes and restart:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

