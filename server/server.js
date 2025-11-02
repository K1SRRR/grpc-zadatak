const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Pool } = require('pg');

// Load proto file from shared proto folder
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'userdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Initialize database
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE
      )
    `);
  console.log('Database initialized successfully');
  } catch (err) {
  console.error('Failed to initialize database:', err);
    throw err;
  }
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// CreateUser implementation
async function createUser(call, callback) {
  const { name, email } = call.request;
  
  console.log(`CreateUser request: ${name} (${email})`);

  // Validation
  if (!name || !email) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'All fields are required'
    });
  }

  // Validate name
  if (name.trim().length === 0) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'Name cannot be empty'
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'Invalid email format'
    });
  }

  try {
    // Insert user into database (normalize email to lowercase)
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
      [name.trim(), email.toLowerCase()]
    );

    const user = {
      id: result.rows[0].id,  // Keep as number (int32)
      name: result.rows[0].name,
      email: result.rows[0].email
    };

  console.log(`User created: ${name}, email: ${email} (ID: ${user.id})`);
    callback(null, { user });
  } catch (err) {
  console.error(`Error creating user: ${err.message}`);
    
    if (err.code === '23505') { // Unique violation
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'User with this email already exists'
      });
    }
    
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to create user'
    });
  }
}

// GetUsers implementation (supports optional name filter)
async function getUsers(call, callback) {
  const { name_filter } = call.request;
  
  console.log(`GetUsers request${name_filter ? ` (filter: "${name_filter}")` : ''}`);

  try {
    let query;
    let params = [];
    
    if (name_filter && name_filter.trim().length > 0) {
      // Filter by name (case-insensitive partial match)
      query = 'SELECT id, name, email FROM users WHERE LOWER(name) LIKE LOWER($1) ORDER BY id';
      params = [`%${name_filter.trim()}%`];
    } else {
      // Get all users
      query = 'SELECT id, name, email FROM users ORDER BY id';
    }

    const result = await pool.query(query, params);

    const users = result.rows.map(row => ({
      id: row.id,  // Keep as number (int32)
      name: row.name,
      email: row.email
    }));
    
  console.log(`Retrieved ${users.length} users`);
    callback(null, { users });
  } catch (err) {
  console.error(`Error retrieving users: ${err.message}`);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to retrieve users'
    });
  }
}

// DeleteUser implementation
async function deleteUser(call, callback) {
  const { id } = call.request;
  
  console.log(`DeleteUser request for ID: ${id}`);

  if (!id) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'User ID is required'
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
  console.log(`User with ID ${id} not found for deletion`);
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User with ID ${id} not found`
      });
    }

  console.log(`User deleted: ID ${id}`);
    callback(null, {
      success: true,
      message: `User with ID ${id} successfully deleted`
    });
  } catch (err) {
  console.error(`Error deleting user: ${err.message}`);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to delete user'
    });
  }
}

// Wait for DB to be ready by polling
async function waitForDatabase(retries = 20, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
  console.log('Database is ready');
      return;
    } catch (err) {
      console.log(`DB not ready, retry ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Database did not become ready in time');
}

// Start the server
async function main() {
  try {
    // Wait for database to be ready
  console.log('Waiting for database connection...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await waitForDatabase(20, 1000);
    
    // Initialize database
    await initializeDatabase();

    const server = new grpc.Server();
    
    server.addService(userProto.UserService.service, {
      CreateUser: createUser,
      GetUsers: getUsers,
      DeleteUser: deleteUser
    });

    const port = '0.0.0.0:50051';
    server.bindAsync(port, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('Failed to start server:', err);
        return;
      }
      console.log('gRPC User Service started on port 50051');
      console.log('Connected to PostgreSQL database');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
