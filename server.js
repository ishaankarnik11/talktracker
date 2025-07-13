const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
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

// Initialize SQLite database
const db = new sqlite3.Database('./data/interactions.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Interactions table
  db.run(`CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date DATE NOT NULL,
    time TIME NOT NULL,
    person TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    context TEXT,
    response TEXT,
    reflection TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Create default admin user (password: 'admin123')
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'client')`, [hashedPassword]);
});

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

// Login
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
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
      role: req.session.userRole,
      username: req.session.username 
    });
  } else {
    res.json({ authenticated: false });
  }
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