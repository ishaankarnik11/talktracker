// Debug script to test registration functionality
// Run with: node debug-registration.js

const http = require('http');

// Test data
const testData = {
  username: 'debugtest',
  email: 'debug@test.com',
  password: 'debugpass123'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/api/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔍 Testing registration endpoint...');
console.log('📧 Test user:', testData.email);
console.log('👤 Test username:', testData.username);

const req = http.request(options, (res) => {
  console.log('\n📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📤 Response Body:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✅ Registration test successful!');
        console.log('🆔 User ID:', parsed.user.id);
      } else {
        console.log('\n❌ Registration test failed!');
        console.log('🚫 Error:', parsed.error);
      }
    } catch (error) {
      console.log('Raw response:', responseData);
      console.log('❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

// Send the request
req.write(postData);
req.end();