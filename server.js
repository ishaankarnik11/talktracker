require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many API requests, please try again later',
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Only create transporter if email credentials are provided
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('Email service configured with:', process.env.SMTP_USER);
} else {
  console.log('Email service not configured - using console logging for development');
}


// Database initialization
const db = new sqlite3.Database('./data/interactions.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Users table with email and password reset fields
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    is_default_password BOOLEAN DEFAULT 0,
    reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add email column to existing users if it doesn't exist
  db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding email column:', err.message);
    }
  });

  // Add is_default_password column if it doesn't exist
  db.run(`ALTER TABLE users ADD COLUMN is_default_password BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding is_default_password column:', err.message);
    }
  });

  // Add reset token columns if they don't exist
  db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding reset_token column:', err.message);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding reset_token_expires column:', err.message);
    }
  });

  // Interactions table
  db.run(`CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    person TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('Discussion', 'Disagreement', 'Debate', 'Confrontation')),
    context TEXT,
    response TEXT,
    reflection TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  console.log('Database tables initialized successfully');
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Routes

// Input validation middleware
const validateInteraction = (req, res, next) => {
  const { date, time, person, interaction_type, context, response, reflection } = req.body;
  
  if (!date || !time || !person || !interaction_type) {
    return res.status(400).json({ error: 'Date, time, person, and interaction type are required' });
  }
  
  const validTypes = ['Discussion', 'Disagreement', 'Debate', 'Confrontation'];
  if (!validTypes.includes(interaction_type)) {
    return res.status(400).json({ error: 'Invalid interaction type' });
  }
  
  req.body.person = person.trim().substring(0, 100);
  req.body.context = context ? context.trim().substring(0, 500) : '';
  req.body.response = response ? response.trim().substring(0, 500) : '';
  req.body.reflection = reflection ? reflection.trim().substring(0, 500) : '';
  
  next();
};

// Registration
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  
  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }
    
    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (username, email, password, role, is_default_password) VALUES (?, ?, ?, ?, ?)',
      [username.trim(), email.toLowerCase().trim(), hashedPassword, 'client', 0],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user account' });
        }
        
        res.json({ 
          success: true, 
          message: 'Account created successfully! You can now log in.',
          user: {
            id: this.lastID,
            username: username.trim(),
            email: email.toLowerCase().trim()
          }
        });
      }
    );
  });
});

// Login
app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    req.session.email = user.email;
    
    // Check if user needs to change default password
    if (user.is_default_password) {
      res.json({ 
        success: true, 
        requirePasswordChange: true,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        } 
      });
    } else {
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        } 
      });
    }
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.session.userId,
        role: req.session.userRole,
        username: req.session.username,
        email: req.session.email
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Change password (for authenticated users)
app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  
  // Get user's current password
  db.get('SELECT password FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.run(
      'UPDATE users SET password = ?, is_default_password = 0 WHERE id = ?',
      [hashedPassword, req.session.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Password updated successfully' });
      }
    );
  });
});

// Request password reset
app.post('/api/request-password-reset', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  db.get('SELECT id, username, email FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save reset token to database
    db.run(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetExpires.toISOString(), user.id],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Send email (in production, you'd configure real SMTP settings)
        try {
          const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
          
          const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@talktracker.com',
            to: user.email,
            subject: 'Password Reset - Talk Tracker',
            html: `
              <h2>Password Reset Request</h2>
              <p>Hello ${user.username},</p>
              <p>You requested a password reset for your Talk Tracker account.</p>
              <p>Click the link below to reset your password:</p>
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this reset, please ignore this email.</p>
              <br>
              <p>Best regards,<br>Talk Tracker Team</p>
            `
          };
          
          // Send email if transporter is configured, otherwise log to console
          if (transporter) {
            await transporter.sendMail(mailOptions);
            console.log('Password reset email sent to:', user.email);
          } else {
            console.log('=== PASSWORD RESET EMAIL ===');
            console.log('To:', user.email);
            console.log('Subject:', mailOptions.subject);
            console.log('Reset URL:', resetUrl);
            console.log('========================');
          }
          
          res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
        } catch (emailError) {
          console.error('Email error:', emailError);
          // Don't expose email errors to user
          res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
        }
      }
    );
  });
});

// Reset password with token
app.post('/api/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  
  // Find user with valid reset token
  db.get(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
    [token, new Date().toISOString()],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      
      // Hash new password and update
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.run(
        'UPDATE users SET password = ?, is_default_password = 0, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hashedPassword, user.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, message: 'Password reset successfully' });
        }
      );
    }
  );
});

// Validate reset token
app.get('/api/validate-reset-token/:token', (req, res) => {
  const { token } = req.params;
  
  db.get(
    'SELECT username, email FROM users WHERE reset_token = ? AND reset_token_expires > ?',
    [token, new Date().toISOString()],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      
      res.json({ 
        success: true, 
        user: { 
          username: user.username, 
          email: user.email 
        } 
      });
    }
  );
});

// Apply API rate limiting
app.use('/api', apiLimiter);

// Get all interactions (for client)
app.get('/api/interactions', requireAuth, (req, res) => {
  const { limit = 50, offset = 0, search = '', type = '', person = '' } = req.query;
  
  let query = 'SELECT * FROM interactions WHERE user_id = ?';
  let params = [req.session.userId];
  
  if (search) {
    query += ' AND (person LIKE ? OR context LIKE ? OR response LIKE ? OR reflection LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (type) {
    query += ' AND interaction_type = ?';
    params.push(type);
  }
  
  if (person) {
    query += ' AND person LIKE ?';
    params.push(`%${person}%`);
  }
  
  query += ' ORDER BY date DESC, time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get interactions for therapist view (read-only)
app.get('/api/therapist/interactions/:userId', (req, res) => {
  const { userId } = req.params;
  const { token } = req.query;
  
  if (token !== 'therapist-view-token') {
    return res.status(403).json({ error: 'Invalid access token' });
  }
  
  db.all(
    `SELECT 
      id, date, time, person, interaction_type, context, response, reflection, created_at
    FROM interactions 
    WHERE user_id = ? 
    ORDER BY date DESC, time DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Create interaction
app.post('/api/interactions', requireAuth, validateInteraction, (req, res) => {
  const { date, time, person, interaction_type, context, response, reflection } = req.body;
  
  db.run(
    `INSERT INTO interactions (user_id, date, time, person, interaction_type, context, response, reflection)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.session.userId, date, time, person, interaction_type, context, response, reflection],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// Update interaction
app.put('/api/interactions/:id', requireAuth, validateInteraction, (req, res) => {
  const { id } = req.params;
  const { date, time, person, interaction_type, context, response, reflection } = req.body;
  
  db.run(
    `UPDATE interactions 
     SET date = ?, time = ?, person = ?, interaction_type = ?, context = ?, response = ?, reflection = ?
     WHERE id = ? AND user_id = ?`,
    [date, time, person, interaction_type, context, response, reflection, id, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Interaction not found' });
      }
      res.json({ success: true });
    }
  );
});

// Delete interaction
app.delete('/api/interactions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.run(
    'DELETE FROM interactions WHERE id = ? AND user_id = ?',
    [id, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Interaction not found' });
      }
      res.json({ success: true });
    }
  );
});

// Get statistics
app.get('/api/stats', requireAuth, (req, res) => {
  db.all(
    `SELECT 
      interaction_type,
      COUNT(*) as count,
      AVG(CASE WHEN date >= date('now', '-7 days') THEN 1.0 ELSE 0.0 END) * COUNT(*) as recent_count
     FROM interactions 
     WHERE user_id = ? 
     GROUP BY interaction_type`,
    [req.session.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const stats = {
        total: 0,
        discussion: 0,
        disagreement: 0,
        debate: 0,
        confrontation: 0,
        recent_total: 0
      };
      
      rows.forEach(row => {
        stats.total += row.count;
        stats.recent_total += Math.round(row.recent_count);
        stats[row.interaction_type.toLowerCase()] = row.count;
      });
      
      res.json(stats);
    }
  );
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/therapist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'therapist.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Talk Tracker server running on port ${PORT}`);
  console.log(`Client interface: http://localhost:${PORT}`);
  console.log(`Therapist dashboard: http://localhost:${PORT}/therapist`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});