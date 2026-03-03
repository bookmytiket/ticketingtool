# Setup Guide - MongoDB Integration

This guide will help you set up the ticketing tool with MongoDB Compass connection.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** installed and running (or MongoDB Atlas connection string)
3. **MongoDB Compass** (optional, for GUI database management)

## Step 1: Install MongoDB

### Option A: Local MongoDB Installation

1. Download and install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   ```bash
   # On Linux
   sudo systemctl start mongod
   
   # On macOS
   brew services start mongodb-community
   
   # On Windows
   # MongoDB should start automatically as a service
   ```

### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get your connection string
3. Use the connection string in the `.env` file

## Step 2: Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory:
   ```bash
   cp .env.example .env
   ```

4. Edit `server/.env` and configure:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ticketing_tool
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ticketing_tool
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

   The server should start on `http://localhost:5000`

## Step 3: Frontend Setup

1. Navigate back to the root directory:
   ```bash
   cd ..
   ```

2. Install frontend dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and set the API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```

   The frontend should start on `http://localhost:5173` (or another port if 5173 is busy)

## Step 4: Connect MongoDB Compass

1. Open MongoDB Compass
2. Connect using one of these connection strings:

   **Local MongoDB:**
   ```
   mongodb://localhost:27017
   ```

   **MongoDB Atlas:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net
   ```

3. Once connected, you should see the `ticketing_tool` database with the following collections:
   - `users` - User accounts
   - `tickets` - Support tickets
   - `roles` - User roles and permissions
   - `ssoconfigs` - SSO provider configurations
   - `emailsettings` - Email (SMTP/IMAP) settings
   - `logos` - Custom logo storage

## Step 5: Create Initial Admin User

You can create an admin user in two ways:

### Option A: Using MongoDB Compass

1. Open MongoDB Compass
2. Navigate to `ticketing_tool` database → `users` collection
3. Click "Insert Document"
4. Add a document with this structure (password will be hashed automatically):
   ```json
   {
     "name": "Admin User",
     "email": "admin@example.com",
     "password": "admin123",
     "role": "admin",
     "status": "active"
   }
   ```

### Option B: Using the Registration API

1. Make a POST request to `http://localhost:5000/api/auth/register`:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin User",
       "email": "admin@example.com",
       "password": "admin123",
       "role": "admin"
     }'
   ```

## Step 6: Verify Connection

1. Open the frontend application in your browser: `http://localhost:5173`
2. Login with the admin credentials you created
3. Check MongoDB Compass to see data being created/updated in real-time

## Troubleshooting

### Backend won't start
- Check if MongoDB is running: `mongosh` or `mongo` command should connect
- Verify the `MONGODB_URI` in `server/.env` is correct
- Check if port 5000 is available

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check `VITE_API_URL` in root `.env` file
- Check browser console for CORS errors

### MongoDB connection errors
- Verify MongoDB service is running
- Check connection string format
- For Atlas: Ensure your IP is whitelisted in Atlas dashboard

## Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'user' | 'agent' | 'admin',
  status: 'active' | 'inactive',
  mfaEnabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Tickets Collection
```javascript
{
  ticketId: Number (unique, auto-increment),
  title: String,
  description: String,
  category: String,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  status: 'open' | 'in-progress' | 'resolved' | 'closed',
  creator: ObjectId (ref: User),
  assignee: ObjectId (ref: User),
  comments: [{
    author: ObjectId (ref: User),
    content: String,
    attachments: Array,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Production Deployment

For production:
1. Change `JWT_SECRET` to a strong random string
2. Set `NODE_ENV=production`
3. Use MongoDB Atlas or a managed MongoDB service
4. Configure proper CORS settings
5. Set up environment variables securely
6. Use HTTPS for both frontend and backend

