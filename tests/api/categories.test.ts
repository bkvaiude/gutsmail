import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/categories/route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { mockCategory, mockSession } from '../utils';

describe('Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/categories', () => {
    it('should return categories for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.findMany).mockResolvedValue([
        { ...mockCategory, _count: { emails: 5 } },
      ]);

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Work');
      expect(data[0]._count.emails).toBe(5);
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.findMany).mockRejectedValue(new Error('DB Error'));

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch categories');
    });

    it('should filter categories by user ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/categories');
      await GET(request);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockSession.user.id },
        })
      );
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.create).mockResolvedValue(mockCategory);

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work',
          description: 'Work related emails',
          color: '#1a73e8',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Work');
      expect(data.description).toBe('Work related emails');
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work',
          description: 'Work emails',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Work emails',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 when description is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should use default color if not provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.create).mockResolvedValue(mockCategory);

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work',
          description: 'Work emails',
        }),
      });

      await POST(request);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            color: '#1a73e8',
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.category.create).mockRejectedValue(new Error('DB Error'));

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work',
          description: 'Work emails',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create category');
    });
  });
});
