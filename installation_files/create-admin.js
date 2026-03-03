#!/usr/bin/env node

/**
 * Create Default Admin User
 * This script creates a default admin user with known credentials
 * Run from project root: node create-admin.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;
const serverDir = join(projectRoot, 'server');

// Default admin credentials
const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
  name: 'Administrator',
  role: 'admin'
};

// Create script that runs in server directory
const scriptContent = `import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Organization from './models/Organization.js';

dotenv.config();

const DEFAULT_ADMIN = {
  email: '${DEFAULT_ADMIN.email}',
  password: '${DEFAULT_ADMIN.password}',
  name: '${DEFAULT_ADMIN.name}',
  role: '${DEFAULT_ADMIN.role}'
};

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool';
    const options = {};
    
    await mongoose.connect(mongoUri, options);
    console.log('✓ Connected to MongoDB\\n');

    // Create or get default organization
    let organization = await Organization.findOne({ name: 'Default Organization' });
    if (!organization) {
      organization = await Organization.create({
        name: 'Default Organization',
        description: 'Default organization created during installation',
        status: 'active'
      });
      console.log('✓ Created default organization');
    } else {
      console.log('✓ Default organization exists');
    }

    // Check if admin user exists
    let admin = await User.findOne({ email: DEFAULT_ADMIN.email });
    
    if (admin) {
      // Delete existing admin to recreate with correct password
      await User.deleteOne({ email: DEFAULT_ADMIN.email });
      console.log('✓ Removed existing admin user');
    }
    
    // Create new admin user (password will be hashed by pre-save hook)
    admin = new User({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password, // Will be hashed by pre-save hook
      role: DEFAULT_ADMIN.role,
      status: 'active',
      organization: organization._id
    });
    
    await admin.save();
    console.log(\`✓ Created admin user: \${DEFAULT_ADMIN.email}\`);

    // Verify password works
    const testUser = await User.findOne({ email: DEFAULT_ADMIN.email }).select('+password');
    const passwordMatch = await testUser.comparePassword(DEFAULT_ADMIN.password);
    if (passwordMatch) {
      console.log('✓ Password verification successful');
    } else {
      console.log('⚠ Password verification failed - there may be an issue');
    }

    console.log('\\n' + '='.repeat(50));
    console.log('  Default Admin Credentials');
    console.log('='.repeat(50));
    console.log(\`Email:    \${DEFAULT_ADMIN.email}\`);
    console.log(\`Password: \${DEFAULT_ADMIN.password}\`);
    console.log('='.repeat(50));
    console.log('\\n✓ Admin user ready! You can now login.\\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\\n✗ Error creating admin user:');
    console.error(error.message);
    console.error(error.stack);
    
    if (error.message.includes('getaddrinfo')) {
      console.error('\\nMongoDB connection failed. Please check:');
      console.error('1. MongoDB is running');
      console.error('2. MONGODB_URI in server/.env is correct');
    }
    
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
`;

// Write script to server directory
const tempScript = join(serverDir, 'create-admin-temp.js');
writeFileSync(tempScript, scriptContent);

// Run the script from server directory
import { execSync } from 'child_process';
try {
  execSync(`node create-admin-temp.js`, { stdio: 'inherit', cwd: serverDir });
} catch (error) {
  console.error('Failed to create admin user');
  process.exit(1);
} finally {
  // Clean up temp script
  try {
    import('fs').then(fs => fs.default.unlinkSync(tempScript));
  } catch (e) {
    // Ignore cleanup errors
  }
}
