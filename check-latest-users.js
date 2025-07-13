const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/interactions.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

console.log('Checking for latest user registrations...\n');

db.all('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC', (err, users) => {
  if (err) {
    console.error('Database error:', err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${users.length} total users in database:\n`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');
  });
  
  if (users.length > 0) {
    const latestUser = users[0];
    console.log(`Most recent registration:`);
    console.log(`📧 ${latestUser.email}`);
    console.log(`👤 ${latestUser.username}`);
    console.log(`⏰ ${latestUser.created_at}`);
  }
  
  db.close();
});