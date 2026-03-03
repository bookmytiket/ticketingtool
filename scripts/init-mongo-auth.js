// MongoDB initialization script for authentication
// This script creates a user for the ticketing_tool database
// Note: Root user is created automatically via MONGO_INITDB_ROOT_USERNAME/MONGO_INITDB_ROOT_PASSWORD

// Switch to ticketing_tool database
db = db.getSiblingDB('ticketing_tool');

// Create application user for ticketing_tool database
try {
  db.createUser({
    user: 'mongoadmin',
    pwd: 'mongopassword',
    roles: [
      { role: 'readWrite', db: 'ticketing_tool' }
    ]
  });
  print('MongoDB application user created successfully!');
  print('Username: mongoadmin');
  print('Password: mongopassword');
  print('Database: ticketing_tool');
} catch (e) {
  // User might already exist
  if (e.code === 51003) {
    print('MongoDB application user already exists.');
  } else {
    print('Error creating user: ' + e);
  }
}

