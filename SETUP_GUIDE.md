# GutsMail - API Setup Guide

**by Highguts Solutions LLP** | [highguts.com](https://highguts.com)

This guide will walk you through setting up all required API keys and credentials.

## Prerequisites
- Google account
- Modern web browser
- Terminal access

---

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top (next to "Google Cloud")
4. Click **"NEW PROJECT"**
5. Enter project details:
   - **Project name**: `Email Intelligence` (or your preferred name)
   - **Organization**: Leave as "No organization" (unless you have one)
6. Click **"CREATE"**
7. Wait for the project to be created (you'll see a notification)
8. Select your new project from the dropdown

### 1.2 Enable Required APIs

1. In the left sidebar, go to **"APIs & Services"** > **"Library"**
2. Search for **"Gmail API"** and click on it
3. Click **"ENABLE"**
4. Go back to the Library (click "APIs & Services" > "Library" again)
5. Search for **"Google+ API"** (or "Google People API")
6. Click **"ENABLE"**

### 1.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"CREATE"**
4. Fill in the required fields:
   - **App name**: `Email Intelligence`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"SAVE AND CONTINUE"**
6. On the "Scopes" page, click **"ADD OR REMOVE SCOPES"**
7. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
8. Click **"UPDATE"** then **"SAVE AND CONTINUE"**
9. On "Test users" page, click **"ADD USERS"**
10. Add your Gmail address that you'll use for testing
11. Click **"ADD"** then **"SAVE AND CONTINUE"**
12. Review and click **"BACK TO DASHBOARD"**

### 1.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"** as the Application type
5. Enter a name: `Email Intelligence Web Client`
6. Under **"Authorized JavaScript origins"**, click **"+ ADD URI"**:
   - Add: `http://localhost:3000`
7. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**:
   - Add: `http://localhost:3000/api/auth/callback/google`
8. Click **"CREATE"**
9. A popup will show your credentials:
   - **Copy the Client ID** (save it temporarily in a text file)
   - **Copy the Client Secret** (save it temporarily)
10. Click **"OK"**

**Important**: Keep these credentials secure! You'll add them to your `.env` file later.

---

## Step 2: Google Gemini API Setup

### 2.1 Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account (use the same account as above)
3. Accept the Terms of Service if prompted
4. Click **"Get API key"** or **"Create API key"**
5. Choose **"Create API key in new project"** (or select your existing project)
6. Your API key will be displayed
7. Click the **Copy** button to copy the key
8. **Save this key securely** (you'll need it for the `.env` file)

**Note**: Gemini has a generous free tier. Check the [pricing page](https://ai.google.dev/pricing) for current limits.

---

## Step 3: Generate NextAuth Secret

### 3.1 Generate a Secure Random String

Open your terminal and run:

```bash
openssl rand -base64 32
```

This will output a random string like: `abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx==`

**Copy this string** - you'll use it as your `NEXTAUTH_SECRET`.

---

## Step 4: Update Environment Variables

### 4.1 Update the `.env` File

1. Open `/home/omnamashivay/projects/jump-demo/email-ai/.env` in a text editor
2. Replace the placeholder values with your actual credentials:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<PASTE_YOUR_GENERATED_SECRET_HERE>"

# Google OAuth
GOOGLE_CLIENT_ID="<PASTE_YOUR_GOOGLE_CLIENT_ID_HERE>"
GOOGLE_CLIENT_SECRET="<PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE>"

# Google Gemini AI
GEMINI_API_KEY="<PASTE_YOUR_GEMINI_API_KEY_HERE>"
```

### 4.2 Verify Your `.env` File

Make sure:
- No quotes around values (unless they're already there)
- No spaces before or after the `=` sign
- All five credentials are filled in
- The file is saved

---

## Step 5: Initialize the Database

Run these commands in your terminal:

```bash
cd /home/omnamashivay/projects/jump-demo/email-ai
npx prisma generate
npx prisma db push
```

Expected output:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema
```

---

## Step 6: Start the Development Server

```bash
npm run dev
```

Expected output:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

---

## Step 7: Test the Application

1. Open your browser and go to: `http://localhost:3000`
2. You should see the Email Intelligence landing page
3. Click **"Get Started"** or **"Sign In"**
4. You should be redirected to Google's OAuth consent screen
5. Select your test user account
6. Review the permissions (Gmail access)
7. Click **"Allow"**
8. You should be redirected back to the app dashboard

### Verify Everything Works:

1. **Test Authentication**: You should see your profile info in the dashboard
2. **Test Email Import**: Click "Import Emails" - it should fetch your recent emails
3. **Test Categories**: Create a new category (e.g., "Work", "Personal")
4. **Test AI Categorization**: Import emails and verify they're automatically categorized
5. **Test Insights**: Go to the "Insights" page to see analytics

---

## Troubleshooting

### Error: "Redirect URI mismatch"
- Go back to Google Cloud Console > Credentials
- Edit your OAuth client
- Ensure `http://localhost:3000/api/auth/callback/google` is in the redirect URIs
- Make sure there are no trailing slashes

### Error: "Access blocked: This app's request is invalid"
- Make sure you've added your email as a test user in the OAuth consent screen
- Verify all required scopes are added

### Error: "Invalid API key" (Gemini)
- Double-check your `GEMINI_API_KEY` in `.env`
- Ensure there are no extra spaces or quotes
- Verify the key is active in Google AI Studio

### Database Errors
- Delete `prisma/dev.db` and run `npx prisma db push` again
- Check that `DATABASE_URL` in `.env` is correct

### Port Already in Use
- Kill the process using port 3000: `lsof -ti:3000 | xargs kill -9`
- Or change the port: `npm run dev -- -p 3001`

---

## Next Steps

Once everything is working:
1. ✅ Phase 1 Complete - API keys configured and app is functional
2. 🔄 Phase 2 - Add testing suite
3. 🔄 Phase 3 - Implement quality-of-life features
4. 🔄 Phase 4 - Production deployment

---

## Security Notes

**IMPORTANT**:
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Never share your API keys publicly
- For production deployment, you'll add these as environment variables in Render
- Rotate your keys if they're ever exposed

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2)
3. Check [NextAuth.js documentation](https://next-auth.js.org/)
4. Verify Gemini API quota at [Google AI Studio](https://aistudio.google.com/)

---

**Ready to proceed?** Follow the steps above, then let me know when you've completed the API setup. I'll help you test everything and move on to Phase 2: Testing Suite!
