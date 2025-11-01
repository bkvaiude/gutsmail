import { describe, it, expect } from 'vitest';
import { extractUnsubscribeLink } from '@/lib/gmail';

describe('Gmail Utility Functions', () => {
  describe('extractUnsubscribeLink', () => {
    it('should extract unsubscribe link with "unsubscribe" keyword', async () => {
      const body = 'To stop receiving emails, click here: https://example.com/unsubscribe?id=123';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBe('https://example.com/unsubscribe?id=123');
    });

    it('should extract opt-out link', async () => {
      const body = 'Click to opt-out: https://example.com/opt-out';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBe('https://example.com/opt-out');
    });

    it('should extract preferences link', async () => {
      const body = 'Manage your preferences at https://example.com/preferences/email';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBe('https://example.com/preferences/email');
    });

    it('should prefer HTML body over plain text', async () => {
      const plainBody = 'No link here';
      const htmlBody = '<a href="https://example.com/unsubscribe">Unsubscribe</a>';
      const result = await extractUnsubscribeLink(plainBody, htmlBody);
      expect(result).toBe('https://example.com/unsubscribe');
    });

    it('should handle multiple links and return first match', async () => {
      const body = `
        Footer content
        https://example.com/unsubscribe
        https://example.com/other-link
      `;
      const result = await extractUnsubscribeLink(body);
      expect(result).toBe('https://example.com/unsubscribe');
    });

    it('should clean up trailing characters', async () => {
      const body = 'Unsubscribe: https://example.com/unsubscribe)';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBe('https://example.com/unsubscribe');
    });

    it('should return null when no unsubscribe link found', async () => {
      const body = 'This is a regular email with no unsubscribe link';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBeNull();
    });

    it('should handle empty body', async () => {
      const result = await extractUnsubscribeLink('');
      expect(result).toBeNull();
    });

    it('should be case insensitive', async () => {
      const body = 'UNSUBSCRIBE at HTTPS://EXAMPLE.COM/UNSUBSCRIBE';
      const result = await extractUnsubscribeLink(body);
      expect(result).toBeTruthy();
    });

    it('should handle links with query parameters', async () => {
      const body = 'https://example.com/unsubscribe?user=123&token=abc&redirect=home';
      const result = await extractUnsubscribeLink(body);
      expect(result).toContain('user=123');
      expect(result).toContain('token=abc');
    });

    it('should extract from HTML anchor tags', async () => {
      const htmlBody = '<p>Click <a href="https://newsletter.com/optout?id=456">here</a> to opt out</p>';
      const result = await extractUnsubscribeLink('', htmlBody);
      expect(result).toBe('https://newsletter.com/optout?id=456');
    });

    it('should handle HTTPS and HTTP links', async () => {
      const httpsBody = 'Link: https://example.com/unsubscribe';
      const httpBody = 'Link: http://example.com/unsubscribe';

      const httpsResult = await extractUnsubscribeLink(httpsBody);
      const httpResult = await extractUnsubscribeLink(httpBody);

      expect(httpsResult).toBeTruthy();
      expect(httpResult).toBeTruthy();
    });
  });
});
