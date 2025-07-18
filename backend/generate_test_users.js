const bcrypt = require('bcryptjs');

async function generateTestUsers() {
  const password = 'password123';
  const saltRounds = 12;
  
  // Generate proper hash
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Generated hash for password123:', hash);
  
  // Generate SQL script
  const sql = `
-- =================================================================
-- UPDATE TEST USER WITH CORRECT PASSWORD HASH
-- =================================================================

UPDATE users 
SET password_hash = '${hash}'
WHERE username = 'test_cashier';

-- Verify the update
SELECT username, authentication_type, is_active, 
       CASE WHEN password_hash IS NOT NULL THEN 'Hash Updated' ELSE 'No Hash' END as hash_status
FROM users 
WHERE username = 'test_cashier';
`;
  
  console.log('\n=== SQL Script to Fix Password Hash ===');
  console.log(sql);
}

generateTestUsers().catch(console.error);