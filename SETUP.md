# Northern Light Wealth Questionnaire System - Setup Instructions

## Project Overview
A secure, flexible client questionnaire platform designed for efficient data collection and Salesforce integration. The system provides robust admin controls and supports structured data gathering with multiple question formats and dynamic form generation.

## Prerequisites
- Node.js 18+ 
- PostgreSQL database
- SendGrid API key (for email notifications)

## Environment Variables Required
Create a `.env` file with the following variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SESSION_SECRET=your_random_session_secret_here
```

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (if exists)
   - Fill in your actual database URL and SendGrid API key

3. **Initialize database:**
   ```bash
   npm run db:push
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

## Default Admin Account
- Username: `NLWAdmin`
- Password: `NLWAdmin2023!`

**Important:** Change this password immediately after first login.

## Key Features
- Risk tolerance questionnaire with 15 questions
- Client management with CSV upload
- Email notifications via SendGrid
- Questionnaire version tracking
- CSV export of responses
- Mobile-responsive design

## Database Schema
The application uses PostgreSQL with the following main tables:
- `clients` - Client information
- `questionnaires` - Questionnaire responses
- `admins` - Admin users

## Technology Stack
- Frontend: React with TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express
- Database: PostgreSQL with Drizzle ORM
- Email: SendGrid
- Authentication: Passport.js with sessions

## Support
Contact the development team for any setup assistance or technical questions.