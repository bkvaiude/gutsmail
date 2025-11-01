import { google } from 'googleapis';
import { prisma } from './prisma';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string;
  date: Date;
  snippet: string;
  body: string;
  htmlBody?: string;
}

export async function getGmailClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (!account || !account.access_token) {
    throw new Error('No Gmail account connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        },
      });
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Create Gmail client from a GmailAccount object (for multi-account support)
export async function getGmailClientFromAccount(gmailAccount: {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: gmailAccount.accessToken,
    refresh_token: gmailAccount.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token && tokens.access_token) {
      await prisma.gmailAccount.update({
        where: { id: gmailAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        },
      });
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
}

function extractHeader(headers: any[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  return match ? match[1] : fromHeader;
}

function extractName(fromHeader: string): string | undefined {
  const match = fromHeader.match(/^"?(.+?)"?\s*</);
  return match ? match[1] : undefined;
}

function getBody(payload: any): { body: string; htmlBody?: string } {
  let body = '';
  let htmlBody: string | undefined;

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = decodeBase64(part.body.data);
      } else if (part.parts) {
        const nested = getBody(part);
        if (!body) body = nested.body;
        if (!htmlBody) htmlBody = nested.htmlBody;
      }
    }
  } else if (payload.body?.data) {
    body = decodeBase64(payload.body.data);
  }

  return { body, htmlBody };
}

export async function fetchRecentEmails(
  userId: string,
  maxResults = 20,
  query = 'in:inbox'
): Promise<GmailMessage[]> {
  const gmail = await getGmailClient(userId);
  return fetchRecentEmailsFromClient(gmail, maxResults, query);
}

// Fetch emails using a Gmail client directly (for multi-account support)
export async function fetchRecentEmailsFromClient(
  gmail: any,
  maxResults = 20,
  query = 'in:inbox'
): Promise<GmailMessage[]> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query,
  });

  const messages = response.data.messages || [];
  const emails: GmailMessage[] = [];

  for (const message of messages) {
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      const headers = msg.data.payload?.headers || [];
      const fromHeader = extractHeader(headers, 'from');
      const { body, htmlBody } = getBody(msg.data.payload);

      emails.push({
        id: msg.data.id!,
        threadId: msg.data.threadId!,
        subject: extractHeader(headers, 'subject'),
        from: extractEmailAddress(fromHeader),
        fromName: extractName(fromHeader),
        to: extractHeader(headers, 'to'),
        date: new Date(parseInt(msg.data.internalDate || '0')),
        snippet: msg.data.snippet || '',
        body: body || msg.data.snippet || '',
        htmlBody,
      });
    } catch (error) {
      console.error(`Error fetching message ${message.id}:`, error);
    }
  }

  return emails;
}

export async function archiveEmail(userId: string, messageId: string): Promise<void> {
  const gmail = await getGmailClient(userId);
  return archiveEmailWithClient(gmail, messageId);
}

// Archive email using a Gmail client directly (for multi-account support)
export async function archiveEmailWithClient(gmail: any, messageId: string): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}

export async function deleteEmail(userId: string, messageId: string): Promise<void> {
  const gmail = await getGmailClient(userId);

  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

export async function extractUnsubscribeLink(body: string, htmlBody?: string): Promise<string | null> {
  const text = htmlBody || body;

  // Strategy 1: Parse HTML anchor tags with unsubscribe-related text
  if (htmlBody) {
    // Look for anchor tags with unsubscribe-related text
    const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const unsubscribeKeywords = [
      'unsubscribe',
      'opt-out',
      'opt out',
      'optout',
      'preferences',
      'manage preferences',
      'email preferences',
      'subscription',
      'manage subscription',
    ];

    let match;
    while ((match = anchorPattern.exec(htmlBody)) !== null) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]*>/g, '').toLowerCase(); // Remove inner HTML tags and lowercase

      // Check if the link text contains any unsubscribe keywords
      if (unsubscribeKeywords.some(keyword => linkText.includes(keyword))) {
        // Clean up the href
        const cleanHref = href.replace(/&amp;/g, '&').trim();
        if (cleanHref.startsWith('http')) {
          return cleanHref;
        }
      }
    }
  }

  // Strategy 2: Look for URLs with unsubscribe keywords in the URL itself (fallback)
  const urlPatterns = [
    /https?:\/\/[^\s<>"]+unsubscribe[^\s<>"]*/gi,
    /https?:\/\/[^\s<>"]+optout[^\s<>"]*/gi,
    /https?:\/\/[^\s<>"]+opt-out[^\s<>"]*/gi,
    /https?:\/\/[^\s<>"]+preferences[^\s<>"]*/gi,
  ];

  for (const pattern of urlPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/[)>\]]+$/, ''); // Clean up trailing characters
    }
  }

  return null;
}
