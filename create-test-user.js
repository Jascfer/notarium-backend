const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Original password:', password);
    console.log('Hashed password:', hashedPassword);
    console.log('');
    console.log('Railway PostgreSQL Query:');
    console.log('------------------------');
    console.log(`INSERT INTO users (first_name, last_name, email, password, role) VALUES ('Demo', 'User', 'demo@notarium.com', '${hashedPassword}', 'user');`);
    console.log('');
    console.log('Test credentials:');
    console.log('Email: demo@notarium.com');
    console.log('Password: 123456');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser(); 