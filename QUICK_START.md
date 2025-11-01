# GutsMail - Quick Start Commands

**by Highguts Solutions LLP** | [highguts.com](https://highguts.com)

## Phase 1: API Setup (Manual Steps Required)

### Step 1: Get Your API Credentials

Follow the detailed guide in `SETUP_GUIDE.md` to:

1. **Google Cloud Console** - Get OAuth credentials
   - URL: https://console.cloud.google.com/
   - Create project → Enable Gmail API → Create OAuth client
   - Save Client ID and Client Secret

2. **Google Gemini API** - Get API key
   - URL: https://aistudio.google.com/app/apikey
   - Create API key
   - Save the key

3. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```
   - Copy the output

### Step 2: Update .env File

Edit `/home/omnamashivay/projects/jump-demo/email-ai/.env` with your credentials:

```env
NEXTAUTH_SECRET="<paste-generated-secret>"
GOOGLE_CLIENT_ID="<paste-client-id>"
GOOGLE_CLIENT_SECRET="<paste-client-secret>"
GEMINI_API_KEY="<paste-api-key>"
```

### Step 3: Verify Configuration

```bash
cd /home/omnamashivay/projects/jump-demo/email-ai
npm run verify-env
```

This will check if all required environment variables are properly configured.

### Step 4: Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### Step 5: Start Development Server

```bash
npm run dev
```

Then open: http://localhost:3000

---

## Phase 2: Testing Suite (Automated)

Once Phase 1 is complete, I'll help you with:

```bash
# Install testing dependencies
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event msw happy-dom

# Run tests
npm run test
npm run test:coverage
```

---

## Phase 3: Quality-of-Life Features (Automated)

Features to be implemented:
- Search and filter emails
- Pagination for email lists
- Error boundaries and toast notifications
- Loading states and retry logic

---

## Phase 4: Production Deployment (Automated + Manual)

### Docker Compose (Local Testing)

```bash
docker compose up --build
```

### Render Deployment

Will be guided step-by-step after local Docker testing succeeds.

---

## Useful Commands

```bash
# Database
npm run db:push          # Sync database schema
npm run db:studio        # Open Prisma Studio GUI

# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Verification
npm run verify-env       # Check environment configuration

# Git (when ready)
git add .
git commit -m "message"
git push
```

---

## Current Status

✅ Phase 1.1: Setup guides provided
✅ Phase 1.2: Verification script created
🔄 Phase 1.3: **YOU ARE HERE** - Configure API keys
⏳ Phase 1.4: Test the application
⏳ Phase 2: Testing suite
⏳ Phase 3: Quality-of-life features
⏳ Phase 4: Production deployment

---

## Next Steps

**Action Required (You):**
1. Open SETUP_GUIDE.md and follow Steps 1-4 to get your API credentials
2. Update your .env file with the credentials
3. Run `npm run verify-env` to check your configuration
4. Let me know when complete, and I'll help you test everything

**Then I'll Handle:**
- Database initialization
- Running the dev server
- Testing the app end-to-end
- Moving to Phase 2 (Testing Suite)
