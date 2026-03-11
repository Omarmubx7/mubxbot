# Technical Documentation

For developers and advanced users.

## System Architecture

### High-Level Overview
```
User Browser
    ↓ HTTP
Next.js Server (Node.js)
    ↓ Queries
PostgreSQL Database (Neon)
    ↓ Results
Back to Browser
```

### Components

**Frontend (React + Next.js)**
- `page.js` - Main chat interface
- `components/ChatWindow.jsx` - Chat display
- `app/admin/` - Admin dashboard

**Backend API Routes**
- `/api/chat` - Process user messages
- `/api/doctors` - Get faculty list
- `/api/admin/` - Admin endpoints

**Data Processing**
- `lib/getOfficeHours.js` - Search logic
- `lib/adminAuth.js` - Authentication
- `lib/adminAnalyticsDb.js` - Analytics queries

**Database**
- PostgreSQL with Neon
- Tables: conversations, messages, search_events, error_events
- Fallback to JSON files if no database

## Performance Optimizations

### Response Time
- Chat responses: < 500ms
- Search queries: < 100ms
- Page load: < 2 seconds

### Caching
- Analytics: 30-second cache
- Static assets: 1-year cache
- Database connection pooling: 20 max connections

### Size Optimization
- Gzip compression: 80% size reduction
- SWC minification: 60% smaller bundles
- Non-blocking analytics logging

## API Endpoints

### Public Endpoints

**POST /api/chat** - Send message
```json
Request: { "message": "Who is Dr. Smith?" }
Response: { "response": "Dr. Smith is...", "conversationId": "..." }
```

**GET /api/doctors** - Get all faculty
```json
Response: [
  { "name": "Dr. Ahmed", "email": "ahmed@htu.edu.jo", "office": "B-123", "hours": ["..."] },
  ...
]
```

### Admin Endpoints

**GET /admin** - Admin dashboard (requires login)

**GET /api/admin/analytics/overview** - Dashboard metrics
**GET /api/admin/analytics/conversations** - All conversations
**GET /api/admin/analytics/search** - Search analytics
**GET /api/admin/analytics/quality** - Error tracking
**GET /api/admin/analytics/performance** - Speed metrics

## Database Schema

### conversations
```sql
- id (TEXT, PRIMARY KEY)
- user_id (TEXT)
- started_at (TIMESTAMPTZ)
- ended_at (TIMESTAMPTZ)
- message_count (INT)
- has_error (BOOLEAN)
- success (BOOLEAN)
```

### messages
```sql
- id (TEXT, PRIMARY KEY)
- conversation_id (TEXT, FOREIGN KEY)
- sender (TEXT) - 'user' or 'bot'
- text (TEXT)
- created_at (TIMESTAMPTZ)
- is_error_trigger (BOOLEAN)
```

### search_events
```sql
- id (TEXT, PRIMARY KEY)
- conversation_id (TEXT, FOREIGN KEY)
- search_type (TEXT) - 'name', 'smart', 'other'
- query (TEXT)
- success (BOOLEAN)
- result_count (INT)
```

### error_events
```sql
- id (TEXT, PRIMARY KEY)
- conversation_id (TEXT, FOREIGN KEY)
- error_type (TEXT)
- error_source (TEXT)
- created_at (TIMESTAMPTZ)
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@host/dbname
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=production
```

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy automatically on push

### Self-Hosted
```bash
npm run build
npm start
```

## Monitoring

### Key Metrics
- Chat response time
- Search accuracy
- Error rate
- User count
- Database query time

### Check in Admin Dashboard
- See real-time analytics
- Download reports (CSV)
- View error logs

## Common Issues & Solutions

### Slow responses?
- Check database connection
- Enable caching
- Use connection pooling

### Database errors?
- Verify DATABASE_URL
- Check Neon connection limit
- Review error logs

### Data inconsistency?
- Regenerate cache
- Rebuild search indexes
- Check data import script

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Check code quality
npm run test             # Run tests
npm run secrets:scan     # Scan for exposed secrets
npm run db:seed:neon     # Initialize database
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit pull request

## Troubleshooting Guide

See main README.md for user-level troubleshooting.

For technical issues:
1. Check error logs: `npm run dev` output
2. Enable debug logging
3. Check database connectivity
4. Review API responses in browser DevTools

---

**For non-technical explanations, see [README.md](README.md)**
