const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'password123';
  const saltRounds = 12;
  
  // Generate a new hash
  const newHash = await bcrypt.hash(password, saltRounds);
  console.log('New hash generated:', newHash);
  
  // Test the new hash
  const isValid = await bcrypt.compare(password, newHash);
  console.log('New hash validation:', isValid);
  
  // Test the hash from the SQL script
  const sqlHash = '$2b$12$LQv3c1yqBwlFDpamOGrMIezHlOjKoKJrOQyJ3vGGKgXPwCaGcuU8q';
  console.log('SQL hash:', sqlHash);
  
  const sqlHashValid = await bcrypt.compare(password, sqlHash);
  console.log('SQL hash validation:', sqlHashValid);
}

testPassword().catch(console.error);