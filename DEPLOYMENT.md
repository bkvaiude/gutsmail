# GutsMail - Render.com Deployment Guide

This guide will help you deploy GutsMail to Render.com with all features working, including the AI-powered unsubscribe agent (Puppeteer).

---

## Prerequisites

- GitHub account
- Render.com account (free tier available)
- Google Cloud Console project with OAuth credentials
- Google Gemini API key

---

## Step 1: Prepare Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API and Google+ API
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://your-app-name.onrender.com` (replace with your actual Render URL)
   - Authorized redirect URIs:
     - `https://your-app-name.onrender.com/api/auth/callback/google`
6. Save your **Client ID** and **Client Secret**

---

## Step 2: Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Save your API key (starts with `AIza...`)

---

## Step 3: Push Code to GitHub

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit for Render deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/gutsmail.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Render.com

### 4.1 Create Render Account
1. Go to [Render.com](https://render.com/)
2. Sign up or log in
3. Click **New +** > **Blueprint**

### 4.2 Connect GitHub Repository
1. Authorize Render to access your GitHub
2. Select your `gutsmail` repository
3. Render will detect the `render.yaml` file automatically

### 4.3 Configure Services

Render will create two services based on `render.yaml`:
- **PostgreSQL Database** (`gutsmail-db`)
- **Web Service** (`gutsmail`)

### 4.4 Set Environment Variables

Go to your **Web Service** > **Environment** and add:

```
NEXTAUTH_SECRET=<generate using: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app-name.onrender.com
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GEMINI_API_KEY=AIzaSy-your-key
AUTO_ARCHIVE_EMAILS=true
```

**Note:** `DATABASE_URL` is automatically set by Render from the PostgreSQL database connection.

### 4.5 Deploy

1. Click **Create Blueprint**
2. Render will:
   - Build your application (`npm install && prisma generate && npm run build`)
   - Create PostgreSQL database
   - Deploy your app
3. Wait for deployment to complete (5-10 minutes)

---

## Step 5: Run Database Migrations

After first deployment:

1. Go to your **Web Service** > **Shell**
2. Run the migration command:
   ```bash
   npx prisma migrate deploy
   ```
3. This creates all database tables in PostgreSQL

---

## Step 6: Update Google OAuth Redirect URIs

1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Update **Authorized redirect URIs** with your actual Render URL:
   - `https://your-actual-app-name.onrender.com/api/auth/callback/google`
4. Save changes

---

## Step 7: Test Your Deployment

1. Visit `https://your-app-name.onrender.com`
2. Click "Sign in with Google"
3. Authorize the application
4. Test features:
   - ✅ Gmail authentication
   - ✅ Import emails
   - ✅ Create categories
   - ✅ AI categorization
   - ✅ AI unsubscribe (Puppeteer)

---

## Troubleshooting

### Issue: "OAuth Error" or "Redirect URI mismatch"
**Solution:** Make sure Google OAuth redirect URIs match your Render URL exactly (including `/api/auth/callback/google`)

### Issue: "Database connection failed"
**Solution:**
- Check that `DATABASE_URL` is set correctly
- Run `npx prisma migrate deploy` in the Shell

### Issue: "Puppeteer/Chrome not found"
**Solution:** Render.com includes Chrome by default. If issues persist, add to `render.yaml`:
```yaml
buildCommand: apt-get update && apt-get install -y chromium && npm install && npx prisma generate && npm run build
```

### Issue: "NEXTAUTH_SECRET required"
**Solution:** Generate a secure secret:
```bash
openssl rand -base64 32
```
Add it to Environment variables.

### Issue: "Cold starts are slow"
**Solution:** Free tier spins down after inactivity. Solutions:
- Upgrade to paid tier ($7/month) for always-on
- Use external monitoring to ping `/api/health` every 10 minutes

---

## Performance Optimization

### 1. Keep Service Alive (Free Tier)
Use a free monitoring service like [UptimeRobot](https://uptimerobot.com/) to ping your health endpoint every 5 minutes:
- URL: `https://your-app-name.onrender.com/api/health`
- Interval: 5 minutes

### 2. Upgrade to Paid Tier
- Web Service: $7/month (no cold starts)
- PostgreSQL: $7/month (persistent, no 90-day expiration)

### 3. Enable Caching
Add Redis for session caching (optional, Render add-on available)

---

## Custom Domain (Optional)

1. Go to **Settings** > **Custom Domain**
2. Add your domain (e.g., `gutsmail.com`)
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable to your custom domain
5. Update Google OAuth redirect URIs

---

## Monitoring & Logs

### View Logs
1. Go to **Web Service** > **Logs**
2. Real-time logs show:
   - Email import progress
   - AI analysis results
   - Puppeteer unsubscribe actions
   - Errors and warnings

### Monitor Performance
1. Go to **Metrics** tab
2. Track:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

---

## Backup & Data Export

### Export Database
```bash
# From Render Shell
pg_dump $DATABASE_URL > backup.sql
```

### Download Backup
Use Render's database backup feature:
1. Go to **PostgreSQL Service** > **Backups**
2. Download latest backup

---

## Scaling

### Horizontal Scaling
Render free tier: 1 instance
Paid tier: Configure multiple instances in **Settings**

### Database Scaling
Upgrade PostgreSQL plan for:
- More storage
- Better performance
- Automated backups

---

## Cost Estimate

### Free Tier (Testing/Staging)
- Web Service: Free (with cold starts)
- PostgreSQL: Free (90-day expiration)
- **Total: $0/month**

### Production (Recommended)
- Web Service: $7/month (always-on)
- PostgreSQL: $7/month (persistent)
- **Total: $14/month**

### Enterprise
- Web Service Pro: $25/month
- PostgreSQL Business: $90/month
- **Total: $115/month**

---

## Security Checklist

- [ ] Rotate `NEXTAUTH_SECRET` regularly
- [ ] Store API keys in environment variables (never in code)
- [ ] Enable HTTPS only (Render provides free SSL)
- [ ] Restrict Google OAuth to specific domains (in Google Console)
- [ ] Monitor logs for suspicious activity
- [ ] Set up rate limiting (optional, future enhancement)
- [ ] Enable CORS restrictions (optional, future enhancement)

---

## Support

- **Render Documentation:** https://render.com/docs
- **GutsMail Issues:** https://github.com/yourusername/gutsmail/issues
- **Highguts Solutions:** https://highguts.com

---

## Next Steps

After successful deployment:
1. Import your first emails
2. Set up categories
3. Test AI features
4. Configure auto-archive settings
5. Try the AI unsubscribe agent
6. Monitor performance and logs
7. Upgrade to paid tier when ready

---

🎉 **Congratulations!** Your GutsMail application is now live on Render.com with all features working, including AI-powered email intelligence and automated unsubscribe capabilities.
