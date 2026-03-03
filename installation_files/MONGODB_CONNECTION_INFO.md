# MongoDB Connection Information

## Connection Details

**MongoDB is configured with:**
- **Username**: `mongoadmin`
- **Password**: `mongopassword`
- **Database**: `ticketing_tool`
- **Authentication Database**: `admin`
- **TLS**: Enabled (requireTLS)

## Connection Strings

### From Docker Containers (Backend)
```
mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin&tls=true
```

### From Host Machine (MongoDB Compass)
```
mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin&tls=true&tlsCAFile=/home/raja/Desktop/ticketing_tool/ssl/mongodb/ca.crt
```

### MongoDB Compass Connection Steps

1. Open MongoDB Compass
2. Click "New Connection"
3. Enter connection string:
   ```
   mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool
   ```
4. Enable "Edit Connection String"
5. Add TLS options:
   - **TLS**: ✅ Enabled
   - **TLS CA File**: `/home/raja/Desktop/ticketing_tool/ssl/mongodb/ca.crt`
6. Click "Connect"

## Important Notes

- Port `27018` is used for external connections (host machine)
- Port `27017` is used internally within Docker network
- TLS is required for all connections
- Authentication is enabled - you must provide credentials

## Changing Credentials

To change MongoDB credentials:

1. Update `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` in `docker-compose.yml`
2. Update `MONGODB_URI` in backend environment variables
3. Remove MongoDB volumes to recreate with new credentials:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

