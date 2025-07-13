# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S talktracker -u 1001

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R talktracker:nodejs /app/data

# Copy application files
COPY --chown=talktracker:nodejs . .

# Create volume mount point for persistent data
VOLUME ["/app/data"]

# Switch to non-root user
USER talktracker

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/api/auth/status', method: 'GET' }; \
    const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["npm", "start"]