# Email Intelligence - AI-Powered Email Management

An intelligent email sorting and management application that uses Google Gemini AI to automatically categorize, summarize, and analyze your emails.

## Features

### Core Features
- Google OAuth authentication with Gmail API integration
- AI-powered email categorization using Gemini 1.5 Flash
- Automatic email summarization
- Category-based email organization
- Bulk email actions (delete, unsubscribe)
- Automatic archiving of processed emails

### Unique AI Features
- **AI Intelligence Dashboard**: Analytics showing inbox health score, time saved, and sender insights
- **Smart Bulk Delete Safety Check**: AI analyzes emails before bulk deletion to prevent accidental removal of important messages
- **Priority Scoring**: AI rates email importance (0-100)
- **Important Information Detection**: Automatically flags emails containing tracking numbers, dates, confirmations, etc.
- **Sender Reputation System**: Builds profiles of frequent senders with AI-generated summaries

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: SQLite (local) / PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google Gemini API (gemini-1.5-flash)
- **Email**: Gmail API
- **Styling**: Tailwind CSS (Gmail-inspired design)

## Prerequisites

1. Node.js 18+ installed
2. Google Cloud Console account
3. Google AI Studio account (for Gemini API key)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd email-ai
npm install
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://your-app.onrender.com/api/auth/callback/google` (for production)
   - Save Client ID and Client Secret

5. Configure OAuth Consent Screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in app information
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Add test users (your Gmail address)
   - Keep app in "Testing" mode (allows up to 100 test users)

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev)
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

### 4. Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Gemini AI
GEMINI_API_KEY="your-gemini-api-key"
```

To generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 5. Database Setup

```bash
npm run db:push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Render

### 1. Prepare Repository

Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" > "PostgreSQL"
3. Name: `email-ai-db`
4. Choose free tier
5. Click "Create Database"
6. Copy the "Internal Database URL"

### 3. Create Web Service on Render

1. Click "New +" > "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `email-ai`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `DATABASE_URL`: (paste Internal Database URL from step 2)
   - `NEXTAUTH_URL`: `https://your-app-name.onrender.com`
   - `NEXTAUTH_SECRET`: (generate new one for production)
   - `GOOGLE_CLIENT_ID`: (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET`: (from Google Cloud Console)
   - `GEMINI_API_KEY`: (from Google AI Studio)
5. Click "Create Web Service"

### 4. Update Google OAuth Redirect URI

1. Go back to Google Cloud Console
2. Add production redirect URI: `https://your-app-name.onrender.com/api/auth/callback/google`

### 5. Database Migration

After deployment, Render will automatically run `prisma generate`. The database schema will be pushed on first build.

## Usage

1. **Sign In**: Click "Sign in with Google" and authorize Gmail access
2. **Create Categories**: Click "+ New Category" and define categories with descriptions
3. **Import Emails**: Click "Import Emails" to fetch and categorize recent emails
4. **Manage Emails**:
   - Click on a category to view emails
   - Select emails for bulk actions
   - Click on an email to view full content
5. **View Insights**: Click "Insights Dashboard" to see AI analytics

## API Endpoints

- `POST /api/auth/[...nextauth]` - Authentication
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/[id]` - Delete category
- `POST /api/emails/import` - Import and process emails
- `GET /api/emails/by-category` - Get emails by category
- `GET /api/emails/[id]` - Get email details
- `POST /api/emails/bulk-analyze` - AI safety check for bulk delete
- `POST /api/emails/bulk-delete` - Bulk delete emails
- `POST /api/emails/unsubscribe` - Get unsubscribe links
- `GET /api/insights` - Get AI insights and analytics

## Project Structure

```
email-ai/
├── app/
│   ├── api/                 # API routes
│   ├── auth/signin/         # Sign-in page
│   ├── dashboard/           # Main dashboard
│   ├── emails/[id]/         # Email detail view
│   ├── insights/            # Analytics dashboard
│   └── layout.tsx           # Root layout
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── gmail.ts             # Gmail API utilities
│   └── gemini.ts            # Gemini AI utilities
├── prisma/
│   └── schema.prisma        # Database schema
└── components/              # React components
```

## Unique Features Explained

### 1. AI Intelligence Dashboard
Shows metrics like inbox health score, time saved, and sender reputation - giving users actionable insights about their email habits.

### 2. Smart Bulk Delete Safety
Before deleting emails in bulk, AI analyzes them and flags potential important emails (orders, meetings, manager messages), preventing accidental deletion.

### 3. Sender Reputation Engine
Builds profiles for each sender including total emails, open rate, importance score, and AI-generated summaries.

### 4. Important Information Detection
Automatically detects and flags emails containing tracking numbers, order confirmations, meeting dates, etc.

## Troubleshooting

### OAuth Error "Access Blocked"
- Ensure your app is in "Testing" mode in Google Cloud Console
- Add your Gmail as a test user
- Check that all required scopes are added

### Database Connection Error
- Verify `DATABASE_URL` is correct
- For Render, use the Internal Database URL
- Run `npm run db:push` to sync schema

### Gemini API Error
- Verify API key is correct
- Check API quota limits (free tier: 15 requests/minute)
- Ensure you're using a valid model name

## License

MIT

## Support

For issues or questions, please create an issue in the GitHub repository.
