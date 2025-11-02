const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

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

// Wait for server to be ready
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wait for server to be available with retry logic
async function waitForServer(client, maxRetries = 30, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try to call GetUsers as a health check
      await new Promise((resolve, reject) => {
        client.GetUsers({}, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
      console.log('Server is ready and responding\n');
      return true;
    } catch (err) {
      console.log(`Waiting for server... (attempt ${i + 1}/${maxRetries})`);
      await sleep(delayMs);
    }
  }
  throw new Error('Server did not become available in time');
}

// Create user helper
function createUser(client, name, email) {
  return new Promise((resolve, reject) => {
  console.log(`Creating user: ${name}`);
    
    client.CreateUser({
      name: name,
      email: email
    }, (err, response) => {
      if (err) {
        console.log(`   Error: ${err.message}`);
        reject(err);
      } else {
        const user = response.user;
        console.log(`   Created: ${user.name} (ID: ${user.id}, Email: ${user.email})`);
        resolve(user);
      }
    });
  });
}

// Get users helper (supports optional name filter)
function getUsers(client, nameFilter = '') {
  return new Promise((resolve, reject) => {
    const filterText = nameFilter ? ` (filter: "${nameFilter}")` : '';
  console.log(`Getting users${filterText}...`);
    
    client.GetUsers({ name_filter: nameFilter }, (err, response) => {
      if (err) {
        console.log(`   Error: ${err.message}`);
        reject(err);
      } else {
        const users = response.users;
        console.log(`   Found ${users.length} users:`);
        users.forEach(user => {
          console.log(`      - ${user.name} (ID: ${user.id}, Email: ${user.email})`);
        });
        resolve(users);
      }
    });
  });
}

// Delete user helper
function deleteUser(client, userId) {
  return new Promise((resolve, reject) => {
  console.log(`Deleting user with ID: ${userId}`);
    
    client.DeleteUser({ id: userId }, (err, response) => {
      if (err) {
        console.log(`   Error: ${err.message}`);
        reject(err);
      } else {
        console.log(`   ${response.message}`);
        resolve(response);
      }
    });
  });
}

// Main demo function
async function main() {
  const serverAddress = 'user-service-server:50051';
  console.log(`Connecting to gRPC server at ${serverAddress}...`);

  const client = new userProto.UserService(
    serverAddress,
    grpc.credentials.createInsecure()
  );

  // Wait for server to be ready with retry logic
  try {
    await waitForServer(client, 30, 1000);
  } catch (err) {
    console.error('Failed to connect to server:', err.message);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Starting User Service CRUD Operations Demo');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. CREATE - Create multiple users
  console.log('STEP 1: Creating users...');
    console.log('-'.repeat(40));
    
    const user1 = await createUser(client, 'Marko Petrović', 'marko.petrovic@example.com');
    const user2 = await createUser(client, 'Ana Jovanović', 'ana.jovanovic@example.com');
    const user3 = await createUser(client, 'Nikola Nikolić', 'nikola.nikolic@example.com');
    
    await sleep(1000);

    // 2. READ ALL - Get all users
  console.log('\nSTEP 2: Reading all users...');
    console.log('-'.repeat(40));
    
    await getUsers(client);
    
    await sleep(1000);

    // 3. DELETE - Delete a user
  console.log('\nSTEP 3: Deleting user...');
    console.log('-'.repeat(40));
    
    await deleteUser(client, user2.id);
    
    await sleep(1000);

    // 4. Final status - Get all remaining users
  console.log('\nSTEP 4: Final remaining users...');
    console.log('-'.repeat(40));
    
    await getUsers(client);
    
    await sleep(1000);

    // 5. Filter by name - Test search functionality
  console.log('\nSTEP 5: Testing name filter...');
    console.log('-'.repeat(40));
    
    await getUsers(client, 'Marko');  // Should find "Marko Petrović"
    await sleep(500);
    
    await getUsers(client, 'nik');    // Should find "Nikola Nikolić" (case-insensitive)
    await sleep(500);
    
    await getUsers(client, 'Ana');    // Should find nothing (deleted)

  console.log('\n' + '='.repeat(60));
  console.log('All CRUD operations completed successfully!');
  console.log('='.repeat(60));

  console.log('\nClient finished. Exiting...');
    process.exit(0);

  } catch (err) {
  console.error('Error occurred:', err.message);
    process.exit(1);
  }
}

main();
