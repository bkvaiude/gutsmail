# API Rate Limit Optimizations - GutsMail

**by Highguts Solutions LLP** | [highguts.com](https://highguts.com)

## Problem
The email import was hitting Gemini API rate limits (429 errors):
- **Old approach**: 4 API calls per email (categorize, summarize, priority, detect info)
- **For 20 emails**: 80 API calls total
- **Free tier limit**: Only 5 requests per minute (RPM) and 25 per day (RPD)
- **Result**: Rate limit errors and import failures

## Solutions Implemented

### 1. Combined AI Analysis Function ✅
**File**: `lib/gemini.ts`

Created `analyzeEmailComplete()` that combines all 4 AI tasks into a single API call:
- Email categorization
- Summary generation
- Priority scoring (0-100)
- Important information detection

**Impact**: Reduced API calls by 75% (80 → 20 for 20 emails)

**Example output**:
```json
{
  "categoryId": "cat_xyz",
  "summary": "Meeting invitation for Q4 planning...",
  "priorityScore": 75,
  "importantInfo": {
    "hasImportant": true,
    "flags": ["meeting_datetime", "calendar_event"]
  }
}
```

### 2. Batch Processing with Delays ✅
**File**: `app/api/emails/import/route.ts`

Implemented intelligent batching to respect rate limits:
- **Batch size**: 4 emails per batch
- **Delay**: 60 seconds between batches
- **Parallel processing**: All emails within a batch process simultaneously
- **Progress logging**: Real-time feedback on batch progress

**Example timeline for 20 emails**:
- Batch 1 (emails 1-4): Process at 0:00
- Wait 60 seconds...
- Batch 2 (emails 5-8): Process at 1:00
- Wait 60 seconds...
- Batch 3 (emails 9-12): Process at 2:00
- And so on...

**Total time**: ~5 minutes for 20 emails (vs immediate failure before)

### 3. Exponential Backoff Retry Logic ✅
**File**: `app/api/emails/import/route.ts`

Added `retryWithBackoff()` function that automatically retries on 429 errors:
- **Max retries**: 5 attempts
- **Backoff delays**: 1s → 2s → 4s → 8s → 16s
- **Jitter**: Random 0-1 second added to prevent thundering herd
- **Smart detection**: Only retries on 429 errors, fails fast on other errors

**Example**:
```
Attempt 1: Fails with 429 → Wait ~1-2s
Attempt 2: Fails with 429 → Wait ~2-3s
Attempt 3: Fails with 429 → Wait ~4-5s
Attempt 4: Success! ✅
```

### 4. Disabled Auto-Archive (Testing) ✅
**File**: `app/api/emails/import/route.ts` (lines 169-176)

Commented out the `archiveEmail()` call that was removing emails from inbox:
- Emails now stay in your Gmail inbox after import
- Can be re-enabled for production by uncommenting
- Clear comment explains why it's disabled

## Results

### Before Optimization
```
❌ 80 API calls for 20 emails
❌ Immediate 429 rate limit errors
❌ Import failures
❌ Emails disappearing from inbox
```

### After Optimization
```
✅ 20 API calls for 20 emails (75% reduction)
✅ Batched processing respects 5 RPM limit
✅ Automatic retry on transient errors
✅ Emails remain in inbox for testing
✅ Real-time progress logging
✅ Graceful error handling
```

## Usage

### Clear Previous Data (Optional)
```bash
npm run db:push -- --force-reset
# or
npx tsx scripts/clear-emails.ts
```

### Run Import
1. Navigate to the app: http://localhost:3000
2. Sign in with Google
3. Click "Import Emails"
4. Watch the console logs for real-time progress

### Monitor Progress
Console output will show:
```
📧 Processing 20 new emails (0 already exist)

📦 Processing batch 1/5 (4 emails)
  ✅ Meeting invitation for Q4 planning...
  ✅ Your order #12345 has shipped...
  ✅ Security alert: New login detected...
  ✅ Weekly newsletter from Tech News...
✨ Batch 1 complete: 4/4 successful
⏳ Waiting 60 seconds before next batch to respect rate limits...

📦 Processing batch 2/5 (4 emails)
...
```

## Configuration

### Adjust Batch Size
Edit `app/api/emails/import/route.ts`:
```typescript
const BATCH_SIZE = 4; // Increase/decrease based on your rate limits
const BATCH_DELAY_MS = 60000; // Adjust delay between batches
```

### Adjust Retry Behavior
Edit the `retryWithBackoff()` function:
```typescript
await retryWithBackoff(
  () => analyzeEmailComplete(...),
  5,      // maxRetries
  1000    // baseDelay in ms
);
```

### Re-enable Auto-Archive
Uncomment lines 172-175 in `app/api/emails/import/route.ts`:
```typescript
try {
  await archiveEmail(session.user.id, gmailMsg.id);
} catch (archiveError) {
  console.error('Error archiving email:', archiveError);
}
```

## API Rate Limits Reference

### Gemini API Free Tier
- **Requests per minute (RPM)**: 5
- **Requests per day (RPD)**: 25
- **Tokens per minute**: 32,000

### Our Usage
- **Old**: 4 calls/email = 80 calls for 20 emails ❌
- **New**: 1 call/email = 20 calls for 20 emails ✅
- **Batch strategy**: 4 calls/minute (under 5 RPM limit) ✅

## Troubleshooting

### Still seeing 429 errors?
- Reduce `BATCH_SIZE` to 3 or 2
- Increase `BATCH_DELAY_MS` to 90000 (90 seconds)

### Need faster processing?
- Upgrade to paid Gemini API tier (60 RPM)
- Increase `BATCH_SIZE` to match your tier limits

### Emails not showing up?
- Check console logs for errors
- Verify Gemini API key has active billing
- Check database with: `npx prisma studio`

## Next Steps

Once rate limit optimizations are working well:
- [ ] Phase 3: Quality-of-life features (search, filters, pagination)
- [ ] Phase 4: Production deployment (Docker, Render, CI/CD)
