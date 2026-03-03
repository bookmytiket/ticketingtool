# MongoDB TLS Setup Guide

## Quick Setup

### 1. Generate SSL Certificates

```bash
./scripts/generate-mongodb-ssl.sh
```

This creates certificates in `ssl/mongodb/`:
- `ca.crt` - CA certificate
- `server.crt` - Server certificate
- `server.key` - Server private key
- `server.pem` - Combined certificate and key (for MongoDB)

### 2. Restart MongoDB Container

```bash
docker compose restart mongodb
```

Or rebuild everything:

```bash
docker compose down
docker compose up -d --build
```

### 3. Connect from MongoDB Compass

**Connection String:**
```
mongodb://localhost:27018/ticketing_tool?tls=true&tlsCAFile=/home/raja/Desktop/ticketing_tool/ssl/mongodb/ca.crt
```

**Or use the connection form:**
1. Open MongoDB Compass
2. Click "New Connection"
3. Enter: `mongodb://localhost:27018/ticketing_tool`
4. Enable "Edit Connection String"
5. Add TLS options:
   - TLS: ✅ Enabled
   - TLS CA File: `/home/raja/Desktop/ticketing_tool/ssl/mongodb/ca.crt`
6. Click "Connect"

### 4. Verify Connection

Check backend logs:
```bash
docker compose logs backend
```

You should see: `MongoDB TLS enabled` and `MongoDB Connected: mongodb`

## Troubleshooting

### MongoDB won't start
- Check if certificates exist: `ls -la ssl/mongodb/`
- Check MongoDB logs: `docker compose logs mongodb`
- Verify certificate permissions (should be 600 for keys, 644 for certs)

### Backend can't connect
- Verify certificates are mounted: `docker compose exec backend ls -la /etc/ssl/mongodb/`
- Check backend logs for TLS errors
- Ensure `MONGODB_CA_FILE` environment variable is set

### Compass connection fails
- Use absolute path for `tlsCAFile`
- Verify port is `27018` (not `27017`)
- Check that TLS is enabled in connection string

## Disable TLS (if needed)

To disable TLS temporarily:

1. Comment out the `command` section in `docker-compose.yml`:
```yaml
# command: >
#   mongod
#   --bind_ip_all
#   --tlsMode requireTLS
#   ...
```

2. Remove TLS from MONGODB_URI:
```yaml
MONGODB_URI=mongodb://mongodb:27017/ticketing_tool
```

3. Restart:
```bash
docker compose restart mongodb backend
```

