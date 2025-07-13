# Talk Tracker - Therapeutic Interaction Tracking Application

A complete web application for tracking and analyzing daily interpersonal interactions according to a therapeutic framework. This application helps individuals monitor their interactions across four types: Discussion, Disagreement, Debate, and Confrontation.

## Features

### Client Interface
- **User Registration**: Self-service account creation with email verification
- **Email-Based Authentication**: Secure login with email addresses  
- **Password Reset**: Email-based password recovery system
- **Interactive Dashboard**: Real-time statistics and quick reference guide
- **Easy Interaction Logging**: Intuitive forms with validation
- **Advanced Filtering**: Search and filter by date, person, type, and keywords
- **Data Export**: CSV export functionality for personal records
- **Responsive Design**: Mobile-friendly interface

### Therapist Dashboard
- **Read-Only Access**: Secure, token-based access to client data
- **Therapeutic Insights**: Pattern analysis and trend identification
- **Advanced Analytics**: Distribution analysis, escalation patterns
- **Professional Reporting**: Export capabilities for therapy sessions
- **Comprehensive Filtering**: Date ranges, keywords, and interaction types

### Security Features
- Password hashing with bcrypt
- Rate limiting for API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection with Helmet.js
- Session management

## Installation

1. **Clone or download the application files**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the server:**
   ```bash
   npm start
   ```
4. **Access the application:**
   - Client Interface: http://localhost:3000
   - Therapist Dashboard: http://localhost:3000/therapist

## Getting Started

1. **Visit the application:** http://localhost:3000
2. **Create an account:** Click "Create a new account" on the login page
3. **Register with your details:**
   - Choose a username (3-30 characters)
   - Enter your email address
   - Create a secure password (6+ characters)
4. **Start tracking:** Login and begin logging your interactions

**Note:** No default accounts exist - all users must register their own accounts for security.

## Interaction Types Framework

### 1. Discussion
- **Characteristics:** Collaborative, calm, curious exchange
- **Color Code:** Blue
- **Therapeutic Goal:** Promote open communication

### 2. Disagreement
- **Characteristics:** Different views but respectful, no conflict
- **Color Code:** Yellow/Amber
- **Therapeutic Goal:** Healthy expression of differing opinions

### 3. Debate
- **Characteristics:** Structured defense of ideas, energetic but not personal
- **Color Code:** Orange
- **Therapeutic Goal:** Constructive argumentation skills

### 4. Confrontation
- **Characteristics:** Personal challenge, emotionally charged
- **Color Code:** Red
- **Therapeutic Goal:** Understanding triggers and de-escalation

## Usage Guide

### For Clients

1. **Login** with your credentials
2. **Add New Interactions** using the form:
   - Select date and time
   - Enter the person involved
   - Choose interaction type by clicking the colored cards
   - Describe the context, your response, and reflection
3. **View Statistics** in real-time dashboard
4. **Search and Filter** your interaction history
5. **Export Data** as CSV for personal records

### For Therapists

1. **Access Dashboard** with client ID and token
2. **Review Interaction Patterns** through analytics
3. **Apply Filters** to focus on specific timeframes or types
4. **Generate Insights** from the therapeutic analysis
5. **Export Reports** for session documentation

### Therapist Access

To access a client's data as a therapist:
- URL: `/therapist?userId=[CLIENT_ID]&token=therapist-view-token`
- Or use the access form with:
  - Client ID: (the user's ID number)
  - Access Token: `therapist-view-token`

## Technical Architecture

### Backend
- **Framework:** Node.js with Express.js
- **Database:** SQLite3 with proper schema design
- **Security:** Helmet, bcrypt, rate limiting, input validation
- **Session Management:** Express-session with secure cookies

### Frontend
- **Technology:** Vanilla HTML5, CSS3, JavaScript
- **Design:** Modern, responsive design with CSS Grid/Flexbox
- **UX:** Progressive enhancement, accessibility focus
- **Color Scheme:** Therapeutic blues and greens

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'client',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Interactions Table
```sql
CREATE TABLE interactions (
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
)
```

## API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/auth/status` - Check authentication status

### Interactions
- `GET /api/interactions` - Fetch user's interactions (with filtering)
- `POST /api/interactions` - Create new interaction
- `PUT /api/interactions/:id` - Update interaction
- `DELETE /api/interactions/:id` - Delete interaction

### Analytics
- `GET /api/stats` - Get interaction statistics
- `GET /api/therapist/interactions/:userId` - Therapist read-only view

## Configuration

### Environment Variables
- `SESSION_SECRET` - Secret key for session management (change in production)
- `PORT` - Server port (default: 3000)
- `SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username/email for sending emails
- `SMTP_PASS` - SMTP password or app password

### Email Configuration
For password reset functionality to work in production, configure your SMTP settings:

1. **Gmail Example:**
   ```bash
   export SMTP_HOST=smtp.gmail.com
   export SMTP_PORT=587
   export SMTP_USER=your-email@gmail.com
   export SMTP_PASS=your-app-password
   ```

2. **During Development:**
   - Password reset links are logged to the console
   - No actual emails are sent unless in production mode

3. **Gmail App Password Setup:**
   - Enable 2-factor authentication on your Gmail account
   - Generate an app password for the application
   - Use the app password in `SMTP_PASS`

### Production Deployment
1. Set `NODE_ENV=production`
2. Use HTTPS and set `cookie.secure = true`
3. Change default passwords and session secrets
4. Configure proper backup for SQLite database
5. Set up process monitoring (PM2 recommended)

## File Structure
```
/
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── public/                # Static files
│   ├── index.html         # Client interface
│   └── therapist.html     # Therapist dashboard
└── data/                  # Database files
    └── interactions.db    # SQLite database
```

## Development

### Adding New Features
1. Update database schema if needed
2. Add API endpoints in server.js
3. Update frontend interfaces
4. Test thoroughly before deployment

### Security Considerations
- Regular password updates
- Monitor for unusual access patterns
- Keep dependencies updated
- Regular database backups
- Use HTTPS in production

## Troubleshooting

### Common Issues
1. **Database not found**: Ensure data directory exists and is writable
2. **Login fails**: Check default credentials (admin/admin123)
3. **Port in use**: Change PORT environment variable
4. **Dependencies missing**: Run `npm install`

### Error Logs
Check console output for detailed error messages and stack traces.

## License

MIT License - Feel free to modify and distribute as needed.

## Support

For technical support or feature requests, please check the application logs and verify configuration settings.

---

**Note**: This application is designed for therapeutic use. Always consult with qualified mental health professionals for proper interpretation of interaction patterns and therapeutic guidance.