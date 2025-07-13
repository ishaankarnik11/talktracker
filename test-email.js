// Quick test script to verify email configuration
// Usage: node test-email.js your-test-email@example.com

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.log('Usage: node test-email.js your-email@example.com');
  process.exit(1);
}

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('❌ Email not configured');
  console.log('Please set SMTP_USER and SMTP_PASS in your .env file');
  console.log('See EMAIL_SETUP.md for detailed instructions');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function testEmailConfig() {
  try {
    console.log('🔍 Testing email configuration...');
    console.log(`📧 SMTP Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`👤 User: ${process.env.SMTP_USER}`);
    
    // Verify SMTP connection
    await transporter.verify();
    console.log('✅ SMTP connection successful');
    
    // Send test email
    console.log(`📤 Sending test email to ${testEmail}...`);
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: testEmail,
      subject: 'Talk Tracker Email Test',
      html: `
        <h2>🎉 Email Configuration Successful!</h2>
        <p>Your Talk Tracker application is now configured to send emails.</p>
        <p><strong>Features that will work:</strong></p>
        <ul>
          <li>Password reset emails</li>
          <li>Account notifications</li>
        </ul>
        <p>You can now use the password reset functionality in your Talk Tracker app.</p>
        <hr>
        <p><small>This test email was sent from your Talk Tracker application.</small></p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log(`📩 Message ID: ${info.messageId}`);
    console.log(`✉️  Check your email at: ${testEmail}`);
    
  } catch (error) {
    console.log('❌ Email test failed:');
    console.log(error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Check:');
      console.log('   - Email address is correct');
      console.log('   - Using app password (not regular password)');
      console.log('   - 2FA is enabled on Gmail');
    }
  }
}

testEmailConfig();