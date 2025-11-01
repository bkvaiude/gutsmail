import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

// Custom render function that wraps components with necessary providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Mock data factories
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  emailVerified: null,
};

export const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockCategory = {
  id: 'cat-1',
  userId: 'test-user-id',
  name: 'Work',
  description: 'Work related emails',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockEmail = {
  id: 'email-1',
  userId: 'test-user-id',
  gmailMessageId: 'msg-123',
  threadId: 'thread-123',
  subject: 'Test Email Subject',
  from: 'sender@example.com',
  to: 'test@example.com',
  date: new Date(),
  snippet: 'This is a test email snippet',
  body: 'This is the full body of the test email',
  categoryId: 'cat-1',
  category: mockCategory,
  aiSummary: 'Test summary',
  aiPriority: 50,
  hasImportantInfo: false,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSenderProfile = {
  id: 'sender-1',
  userId: 'test-user-id',
  email: 'sender@example.com',
  totalEmails: 10,
  avgImportance: 60,
  aiSummary: 'Frequent work contact',
  lastEmailDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockInsight = {
  id: 'insight-1',
  userId: 'test-user-id',
  date: new Date(),
  emailsProcessed: 20,
  timeSavedMinutes: 15,
  topCategories: { Work: 10, Personal: 7, Shopping: 3 },
  inboxHealthScore: 85,
  highPriorityCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock Prisma client for tests
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  email: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  senderProfile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  emailInsight: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Helper to create mock Gmail messages
export function createMockGmailMessage(overrides = {}) {
  return {
    id: 'msg-123',
    threadId: 'thread-123',
    labelIds: ['INBOX'],
    snippet: 'Test email snippet...',
    payload: {
      headers: [
        { name: 'Subject', value: 'Test Subject' },
        { name: 'From', value: 'sender@example.com' },
        { name: 'To', value: 'test@example.com' },
        { name: 'Date', value: new Date().toUTCString() },
      ],
      body: {
        data: Buffer.from('Test email body').toString('base64'),
      },
      parts: [],
    },
    ...overrides,
  };
}

// Helper to create mock Gemini AI responses
export function createMockGeminiResponse(overrides = {}) {
  return {
    category: 'General',
    summary: 'Test email summary',
    priority: 50,
    hasImportantInfo: false,
    ...overrides,
  };
}
