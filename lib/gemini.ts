import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Email {
  subject: string;
  from: string;
  fromName?: string;
  snippet: string;
  body: string;
}

export async function categorizeEmail(
  email: Email,
  categories: Category[]
): Promise<string | null> {
  if (categories.length === 0) {
    return null;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an email categorization assistant. Analyze the email below and determine which category best matches it.

Categories:
${categories.map((c, idx) => `${idx + 1}. ${c.name} (ID: ${c.id}): ${c.description}`).join('\n')}

Email Details:
Subject: ${email.subject}
From: ${email.fromName || email.from}
Snippet: ${email.snippet}

Respond with ONLY the category ID that best matches. If none match well, respond with "none".`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Check if the response is a valid category ID
    const validCategory = categories.find(c => response.includes(c.id));
    return validCategory ? validCategory.id : null;
  } catch (error) {
    console.error('Error categorizing email:', error);
    return null;
  }
}

export async function summarizeEmail(body: string, subject: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Summarize this email in 1-2 concise sentences. Focus on the key message and any action items.

Subject: ${subject}

Body:
${body.slice(0, 2000)}

Provide a clear, actionable summary:`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error summarizing email:', error);
    return 'Unable to generate summary';
  }
}

export async function calculatePriorityScore(email: Email): Promise<number> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this email and rate its importance/priority on a scale of 0-100.

Consider:
- Urgency and time sensitivity
- Sender importance
- Action required
- Potential consequences if ignored

Email:
Subject: ${email.subject}
From: ${email.fromName || email.from}
Snippet: ${email.snippet}

Respond with ONLY a number between 0-100:`;

  try {
    const result = await model.generateContent(prompt);
    const score = parseInt(result.response.text().trim());
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Error calculating priority:', error);
    return 50;
  }
}

export async function detectImportantInfo(body: string): Promise<{
  hasImportant: boolean;
  flags: string[];
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this email and identify any important information that the user might need later.

Look for:
- Tracking numbers
- Order confirmations
- Meeting dates/times
- Phone numbers
- Addresses
- Account numbers
- Confirmation codes
- Passwords or credentials
- Important deadlines

Email content:
${body.slice(0, 2000)}

Respond in JSON format like this:
{"hasImportant": true/false, "flags": ["type1", "type2"]}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasImportant: parsed.hasImportant || false,
        flags: parsed.flags || [],
      };
    }
  } catch (error) {
    console.error('Error detecting important info:', error);
  }

  return { hasImportant: false, flags: [] };
}

export async function analyzeBulkDeleteSafety(emails: Array<{
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
}>): Promise<{
  safeToDelete: string[];
  shouldReview: Array<{ id: string; reason: string }>;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const emailList = emails.map((e, idx) =>
    `${idx + 1}. [ID: ${e.id}] From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet.slice(0, 100)}`
  ).join('\n');

  const prompt = `You are a safety assistant helping prevent accidental deletion of important emails. Analyze this list of emails the user wants to delete.

Identify which emails might be important to keep because they contain:
- Order confirmations or tracking information
- Meeting invitations or calendar events
- Messages from important contacts (managers, clients, family)
- Account or password information
- Bills or financial documents
- Anything time-sensitive or with deadlines

Emails to analyze:
${emailList}

Respond in JSON format:
{
  "safeToDelete": ["id1", "id2"],
  "shouldReview": [
    {"id": "id3", "reason": "Contains order confirmation"},
    {"id": "id4", "reason": "From your manager"}
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        safeToDelete: parsed.safeToDelete || [],
        shouldReview: parsed.shouldReview || [],
      };
    }
  } catch (error) {
    console.error('Error analyzing bulk delete safety:', error);
  }

  // Conservative default: flag all for review
  return {
    safeToDelete: [],
    shouldReview: emails.map(e => ({
      id: e.id,
      reason: 'Unable to analyze - please review manually',
    })),
  };
}

export async function generateSenderSummary(
  senderEmail: string,
  recentEmails: Array<{ subject: string; snippet: string }>
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const emailSamples = recentEmails.slice(0, 5).map((e, idx) =>
    `${idx + 1}. ${e.subject} - ${e.snippet.slice(0, 100)}`
  ).join('\n');

  const prompt = `Based on these recent emails from ${senderEmail}, write a 1-sentence description of what kind of sender this is and the value of their emails.

Recent emails:
${emailSamples}

Provide a concise, helpful description:`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating sender summary:', error);
    return 'Regular sender';
  }
}
