// Script to create MongoDB user for ticketing tool
// Run with: mongosh mongodb://localhost:27017/admin < create-mongodb-user.js
// Or: mongosh mongodb://localhost:27017/admin --file create-mongodb-user.js

use admin

// Check if user already exists
const existingUser = db.getUser("admin")
if (existingUser) {
  print("User 'admin' already exists. Updating password...")
  db.changeUserPassword("admin", "DBPassword@2k25")
  print("✓ Password updated")
} else {
  print("Creating user 'admin'...")
  db.createUser({
    user: "admin",
    pwd: "DBPassword@2k25",
    roles: [
      { role: "readWrite", db: "ticketing_tool" },
      { role: "dbAdmin", db: "ticketing_tool" },
      { role: "readWrite", db: "admin" }
    ]
  })
  print("✓ User created")
}

// Verify
print("\nVerifying user...")
const users = db.getUsers()
printjson(users)

print("\n✓ MongoDB user setup complete!")
print("You can now use:")
print("  MONGODB_URI=mongodb://admin:DBPassword%402k25@localhost:27017/ticketing_tool?authSource=admin")

